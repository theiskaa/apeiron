#!/usr/bin/env node
// Export content/nodes/ into an Obsidian-friendly vault layout:
//   • Filename becomes the node's `title` (not the slug id).
//   • `connections:` is stripped from the YAML frontmatter.
//   • Connections are rewritten as a markdown block under the frontmatter,
//     with each target formatted as an Obsidian tag (`#slug`).
//   • Source files in content/nodes/ are never modified.
//
// Usage: node scripts/export-obsidian.mjs

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SRC_DIR = path.join(process.cwd(), "content", "nodes");
const OUT_DIR = path.join(process.cwd(), "obsidian-export");

// Strip characters that are illegal on common filesystems / confuse Obsidian.
// Obsidian itself accepts spaces, unicode, and most punctuation, but these
// characters are either OS-reserved or break wiki-link resolution.
function sanitizeFilename(title) {
  return title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function renderConnections(connections, idToTitle) {
  if (!Array.isArray(connections) || connections.length === 0) return "";
  const lines = ["## Connections", ""];
  for (const conn of connections) {
    if (!conn || typeof conn.target !== "string") continue;
    // Use the same slug → title conversion the wiki-link rewriter uses,
    // so every `target` points at the renamed file in the vault. Phantom
    // targets get title-cased; authored targets use the file's real title.
    const title = idToTitle.get(conn.target) ?? phantomTitle(conn.target);
    lines.push(`- target: [[${title}]]`);
    if (conn.reason) {
      lines.push(`    - ${conn.reason}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

// Phantom nodes (referenced in connections but with no source file) are
// rendered as title-cased wiki-links so Obsidian creates sensible stubs.
function phantomTitle(slug) {
  return slug
    .split("-")
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function rewriteWikiLinks(content, idToTitle) {
  // Matches [[target]] or [[target|display]]. Pipes, newlines, and nested
  // brackets are excluded from the target capture.
  return content.replace(/\[\[([^\[\]|\n]+)(\|[^\[\]\n]+)?\]\]/g, (match, target, tail) => {
    const trimmed = target.trim();
    // Only rewrite slug-style targets (lowercase, hyphen/alphanumeric). If
    // the link already points at a title (e.g. `[[Brian Jones]]`), leave
    // it untouched.
    if (!/^[a-z0-9][a-z0-9-]*$/.test(trimmed)) return match;
    const title = idToTitle.get(trimmed) ?? phantomTitle(trimmed);
    return `[[${title}${tail ?? ""}]]`;
  });
}

function rewrite(source, idToTitle) {
  const parsed = matter(source);
  const { connections, category, ...rest } = parsed.data;

  // Obsidian reads `tags:` from YAML frontmatter as the canonical tag
  // field. Convert the project's single-valued `category` into a
  // list-form `tags` entry so it behaves the same as inline `#tag` usage.
  const frontmatter = { ...rest };
  if (typeof category === "string" && category.trim().length > 0) {
    frontmatter.tags = [category];
  }

  // Rewrite wiki-links in the body so `[[slug-id]]` becomes `[[Title]]`
  // matching the renamed files. Piped variants keep their display text.
  const body = rewriteWikiLinks(parsed.content, idToTitle);

  // Re-serialize frontmatter without the connections key. gray-matter
  // delegates to js-yaml; the result preserves key order for remaining
  // fields and produces valid YAML.
  const rebuilt = matter.stringify(body, frontmatter);

  // gray-matter places frontmatter, a blank line, then body. Splice the
  // connections block in between the closing `---` and the body so the
  // tags are the first thing a reader sees.
  const fmEnd = rebuilt.indexOf("---", 3);
  if (fmEnd === -1) {
    // No frontmatter — return as-is with the connection block prepended.
    return renderConnections(connections) + rebuilt;
  }
  const closeIdx = rebuilt.indexOf("\n", fmEnd) + 1;
  const head = rebuilt.slice(0, closeIdx);
  const tail = rebuilt.slice(closeIdx).replace(/^\n+/, "");
  const connBlock = renderConnections(connections, idToTitle);
  return connBlock ? `${head}\n${connBlock}\n${tail}` : `${head}\n${tail}`;
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }
  // Start clean so renamed files don't accumulate stale copies.
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".md"));

  // First pass: build the id → title map so the second pass can rewrite
  // `[[slug-id]]` wiki-links to point at the renamed files. Phantom
  // targets (referenced in connections but never authored) are filled in
  // by rewriteWikiLinks via title-casing their slug.
  const idToTitle = new Map();
  const parsedBySource = new Map();
  for (const file of files) {
    const srcPath = path.join(SRC_DIR, file);
    const source = fs.readFileSync(srcPath, "utf-8");
    const parsed = matter(source);
    parsedBySource.set(file, { source, data: parsed.data });
    const id = typeof parsed.data.id === "string" ? parsed.data.id : null;
    const title = typeof parsed.data.title === "string" ? parsed.data.title : null;
    if (id && title) idToTitle.set(id, sanitizeFilename(title));
  }

  const usedNames = new Map();
  let written = 0;
  let totalConnections = 0;

  for (const file of files) {
    const { source, data } = parsedBySource.get(file);
    const title = typeof data.title === "string" && data.title.trim().length > 0
      ? data.title
      : path.basename(file, ".md");
    let base = sanitizeFilename(title);
    // Guard against two different source files producing the same title.
    const seen = usedNames.get(base) ?? 0;
    usedNames.set(base, seen + 1);
    if (seen > 0) base = `${base} (${seen + 1})`;

    const outPath = path.join(OUT_DIR, `${base}.md`);
    const rewritten = rewrite(source, idToTitle);
    fs.writeFileSync(outPath, rewritten);
    written += 1;
    totalConnections += Array.isArray(data.connections)
      ? data.connections.length
      : 0;
  }

  console.log(
    `Wrote ${written} file(s) to ${path.relative(process.cwd(), OUT_DIR)}/ — ${totalConnections} connection(s) moved out of frontmatter.`
  );
}

main();
