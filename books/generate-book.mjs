#!/usr/bin/env node
// Assemble one book per category from content/nodes/. Produces seven
// independent volumes — apeirron-mind, apeirron-origins, etc — each
// with its own book.md + meta.yaml under books/parts/<id>/.
//
//   • Chapters within a volume are alphabetized by title.
//   • Wiki-links and connections within the same volume become anchor
//     links. Cross-volume references render as italic plain text in
//     prose; connection-list entries get a small "(see <Volume>)" tag
//     so a reader can find the chapter in the appropriate book.
//   • Phantom targets (referenced but not authored) render as italic
//     plain text in both contexts.
//   • Each chapter heading carries an explicit {#slug} so anchor links
//     resolve identically across pandoc's epub and LaTeX writers; every
//     subsection gets a chapter-scoped {#slug-sN} ID so auto-generated
//     IDs cannot collide between chapters.
//
// Usage: node books/generate-book.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

// Paths are resolved relative to this script's location so the
// generator works regardless of the CWD it's invoked from.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NODES_DIR = path.join(ROOT, "content", "nodes");
const CATEGORIES_FILE = path.join(ROOT, "content", "categories.json");
const OUT_DIR = path.join(ROOT, "books");
const PARTS_DIR = path.join(OUT_DIR, "parts");

const SERIES_TITLE = "Biggest Questions Humanity Asks";
const AUTHORS = "Ismael Shakverdiev and Sandro Abashidze";

function loadCategories() {
  const raw = fs.readFileSync(CATEGORIES_FILE, "utf-8");
  return JSON.parse(raw);
}

function loadNodes() {
  const files = fs.readdirSync(NODES_DIR).filter((f) => f.endsWith(".md"));
  const nodes = [];
  for (const file of files) {
    const src = fs.readFileSync(path.join(NODES_DIR, file), "utf-8");
    const parsed = matter(src);
    const { id, title, category, connections } = parsed.data;
    if (!id || !title || !category) {
      console.warn(`skipping ${file}: missing id/title/category`);
      continue;
    }
    nodes.push({
      id,
      title,
      category,
      connections: Array.isArray(connections) ? connections : [],
      body: parsed.content.trim(),
    });
  }
  return nodes;
}

// Shift every ATX heading down by N levels and assign each one an
// explicit ID scoped to the chapter slug. Without scoped IDs pandoc's
// auto-id algorithm can derive the same identifier from a subsection
// inside one chapter as from a chapter slug elsewhere in the volume,
// which produces a duplicate-id error in the EPUB writer.
function shiftHeadings(body, by, chapterSlug) {
  let counter = 0;
  return body.replace(
    /^(#{1,6})([ \t]+)(.+?)(?:[ \t]+\{#[^}]+\})?[ \t]*$/gm,
    (_m, hashes, space, title) => {
      const depth = Math.min(hashes.length + by, 6);
      counter += 1;
      return `${"#".repeat(depth)}${space}${title.trim()} {#${chapterSlug}-s${counter}}`;
    }
  );
}

const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in",
  "of", "on", "or", "the", "to", "vs",
]);
function phantomTitle(slug) {
  return slug
    .split("-")
    .map((w, i) => {
      if (w.length === 0) return w;
      if (i > 0 && SMALL_WORDS.has(w)) return w;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
}

// Resolve [[slug]] and [[slug|display]] within the current volume.
//   • Same-volume target  → markdown anchor link
//   • Cross-volume target → italic plain text (no anchor; prose stays
//     readable without a confusing dead link)
//   • Phantom target      → italic plain text
function rewriteWikiLinks(body, currentCategory, idMap) {
  return body.replace(
    /\[\[([a-z0-9][a-z0-9-]*)(\|([^\[\]\n]+))?\]\]/g,
    (_m, slug, _pipe, display) => {
      const meta = idMap.get(slug);
      const text = (display ?? meta?.title ?? phantomTitle(slug)).trim();
      if (meta && meta.category === currentCategory) {
        return `[${text}](#${slug})`;
      }
      return `*${text}*`;
    }
  );
}

// Render the per-chapter Connections list. Same-volume connections
// become anchor links; cross-volume ones are tagged with the volume
// label so a reader can locate the chapter in the correct book.
function renderConnections(connections, currentCategory, idMap, categoryLabels) {
  if (!connections || connections.length === 0) return "";
  const lines = ["", "### Connections", ""];
  for (const conn of connections) {
    if (!conn || typeof conn.target !== "string") continue;
    const slug = conn.target;
    const meta = idMap.get(slug);
    const title = meta?.title ?? phantomTitle(slug);
    let entry;
    if (meta && meta.category === currentCategory) {
      entry = `**[${title}](#${slug})**`;
    } else if (meta) {
      const volumeLabel = categoryLabels.get(meta.category) ?? meta.category;
      entry = `***${title}*** *(see ${volumeLabel})*`;
    } else {
      entry = `***${title}***`;
    }
    lines.push(`- ${entry} — ${conn.reason ?? ""}`.trimEnd());
  }
  lines.push("");
  return lines.join("\n");
}

function renderChapter(node, currentCategory, idMap, categoryLabels) {
  const heading = `## ${node.title} {#${node.id}}`;
  const shifted = shiftHeadings(node.body, 1, node.id);
  const linked = rewriteWikiLinks(shifted, currentCategory, idMap);
  const connections = renderConnections(
    node.connections,
    currentCategory,
    idMap,
    categoryLabels
  );
  return `${heading}\n\n${linked}\n${connections}`.trimEnd() + "\n";
}

function renderVolume(category, nodes, idMap, categoryLabels) {
  const sorted = [...nodes].sort((a, b) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" })
  );
  const chapters = sorted
    .map((n) => renderChapter(n, category.id, idMap, categoryLabels))
    .join("\n");
  // The volume opens with an H1 carrying the category label. With
  // pandoc's --top-level-division=part this maps to a Part heading in
  // LaTeX and a top-level section in the EPUB nav. There is exactly
  // one Part per volume, so it doubles as a half-title.
  return `# ${category.label}\n\n${chapters}`;
}

// LaTeX snippet inserted via --include-before-body to render the cover
// PNG as page 1 of the PDF, edge-to-edge.
//
// The cover is stamped as a one-shot shipout-picture background via
// eso-pic's \AddToShipoutPicture* (loaded in header.tex). Two reasons
// for that mechanism over a body \includegraphics:
//
//   1. \includegraphics[width=\paperwidth,height=\paperheight] is
//      taller than the body's \textheight, so LaTeX bumps the image
//      to a new page when it can't fit on page 1.
//
//   2. \newgeometry{margin=0pt} would expand the text area to
//      paperwidth/paperheight, but it internally calls \clearpage to
//      apply, which still emits a blank page 1 on a fresh document.
//
// \AddToShipoutPicture* sidesteps both issues: it overlays content on
// the next page that ships out, without touching page flow. The
// trailing \null + \clearpage forces page 1 to be shipped (so the
// overlay actually fires) and advances to page 2 for the TOC.
//
// The cover path is absolute because pandoc invokes xelatex from a
// temp directory; relative paths silently fail (no error, empty box).
function buildCoverTex(coverAbs) {
  return [
    "\\AddToShipoutPicture*{%",
    `  \\put(0,0){\\includegraphics[width=\\paperwidth,height=\\paperheight]{${coverAbs}}}%`,
    "}",
    "\\thispagestyle{empty}",
    "\\null",
    "\\clearpage",
    "",
  ].join("\n");
}

// LaTeX preamble snippet injected via --include-in-header.
//
//   • \let\maketitle\relax disables pandoc's auto title page. In
//     pandoc 3.x \maketitle is emitted BEFORE include-before-body, so
//     a \let inside the cover body runs too late — it has to live in
//     the preamble.
//   • eso-pic provides \AddToShipoutPicture, which the cover body
//     uses to stamp the cover image as a page background without
//     touching the page-flow / geometry machinery.
function buildHeaderTex() {
  return [
    "\\let\\maketitle\\relax",
    "\\usepackage{eso-pic}",
    "",
  ].join("\n");
}

function buildMetadata(category, coverRel, hasCover) {
  const coverLine = hasCover ? `cover-image: ${coverRel}\n` : "";
  return [
    "---",
    `title: "apeirron — ${category.label}"`,
    `subtitle: "${SERIES_TITLE}"`,
    `author: "${AUTHORS}"`,
    'lang: "en-US"',
    `date: "${new Date().toISOString().slice(0, 10)}"`,
    'rights: "© apeirron"',
    coverLine.trimEnd(),
    "documentclass: book",
    "classoption:",
    "  - oneside",
    "  - 10pt",
    "geometry:",
    "  - paperwidth=6in",
    "  - paperheight=9in",
    "  - inner=0.85in",
    "  - outer=0.7in",
    "  - top=0.85in",
    "  - bottom=0.85in",
    "linestretch: 1.15",
    "linkcolor: black",
    "urlcolor: black",
    "toc-title: Contents",
    "---",
    "",
  ]
    .filter((l) => l !== "")
    .join("\n") + "\n";
}

function main() {
  if (!fs.existsSync(NODES_DIR)) {
    console.error(`nodes directory not found: ${NODES_DIR}`);
    process.exit(1);
  }
  fs.mkdirSync(PARTS_DIR, { recursive: true });

  const categories = loadCategories();
  const nodes = loadNodes();

  // Build the lookup tables. idMap is the global view used by every
  // volume to classify its outgoing wiki-links. categoryLabels turns
  // a category id into its display label for cross-volume tags.
  const idMap = new Map(
    nodes.map((n) => [n.id, { title: n.title, category: n.category }])
  );
  const categoryLabels = new Map(categories.map((c) => [c.id, c.label]));

  // Bucket nodes per category and warn about any that have unknown
  // categories — they would silently disappear otherwise.
  const byCategory = new Map(categories.map((c) => [c.id, []]));
  const orphans = [];
  for (const node of nodes) {
    if (byCategory.has(node.category)) byCategory.get(node.category).push(node);
    else orphans.push(node);
  }
  if (orphans.length > 0) {
    console.warn(
      `note: ${orphans.length} node(s) have unknown categories (will be skipped) — ${orphans.map((n) => `${n.id}(${n.category})`).join(", ")}`
    );
  }

  let totalVolumes = 0;
  let totalChapters = 0;
  for (const cat of categories) {
    const items = byCategory.get(cat.id) ?? [];
    if (items.length === 0) continue;

    const volumeDir = path.join(PARTS_DIR, cat.id);
    fs.mkdirSync(volumeDir, { recursive: true });

    const body = renderVolume(cat, items, idMap, categoryLabels);
    fs.writeFileSync(path.join(volumeDir, "book.md"), body);

    // Cover path written relative to project root (where pandoc is
    // invoked from). Pandoc 3.x resolves cover-image against CWD and
    // ignores --resource-path for this metadata field specifically.
    // Covers live under public/books/ so the Next.js app can serve
    // them at /books/cover-<id>.png. Pandoc resolves cover-image
    // relative to CWD (project root), and cover.tex bakes in the
    // absolute path computed below — both work from the new location.
    const coverRel = `public/books/cover-${cat.id}.png`;
    const coverAbs = path.join(ROOT, coverRel);
    const hasCover = fs.existsSync(coverAbs);
    fs.writeFileSync(
      path.join(volumeDir, "meta.yaml"),
      buildMetadata(cat, coverRel, hasCover)
    );

    // Pandoc only embeds `cover-image` in EPUB output. The default
    // LaTeX template ignores it, so for PDF we hand-roll a titlepage
    // snippet that drops the cover image at the very front. The build
    // script wires this in via --include-before-body for PDF only.
    if (hasCover) {
      fs.writeFileSync(
        path.join(volumeDir, "cover.tex"),
        buildCoverTex(coverAbs)
      );
      fs.writeFileSync(
        path.join(volumeDir, "header.tex"),
        buildHeaderTex()
      );
    }

    totalVolumes += 1;
    totalChapters += items.length;
    console.log(
      `  ${cat.id.padEnd(11)} ${String(items.length).padStart(3)} chapters → ${path.relative(ROOT, volumeDir)}/`
    );
  }

  console.log(
    `wrote ${totalVolumes} volume(s) · ${totalChapters} chapters total`
  );
}

main();
