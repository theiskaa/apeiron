import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  rmSync,
} from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(ROOT, "content", "nodes");
const CATEGORIES_PATH = path.join(ROOT, "content", "categories.json");
const METADATA_PATH = path.join(ROOT, "lib", "generated", "graph-metadata.json");
const CONTENT_OUT_DIR = path.join(ROOT, "public", "content");

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeStringify);

async function markdownToHtml(md) {
  const result = await markdownProcessor.process(md);
  return String(result);
}

function lastCommitIso(filePath) {
  try {
    const iso = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return iso || null;
  } catch {
    return null;
  }
}

function firstCommitIso(filePath) {
  try {
    const output = execSync(
      `git log --diff-filter=A --follow --format=%cI -- "${filePath}"`,
      { stdio: ["ignore", "pipe", "ignore"] }
    )
      .toString()
      .trim();
    const lines = output.split("\n").filter(Boolean);
    return lines[lines.length - 1] ?? null;
  } catch {
    return null;
  }
}

function fileMtimeIso(filePath) {
  try {
    return statSync(filePath).mtime.toISOString();
  } catch {
    return null;
  }
}

function getExcerpt(markdown, maxLength = 160) {
  return markdown
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, maxLength)
    .replace(/\s+\S*$/, "…");
}

function resolveWikiLinks(html, nodeById, nodeByTitle, phantomIds) {
  return html.replace(/\[\[([^\]]+)\]\]/g, (_match, ref) => {
    const trimmed = ref.trim();
    const node =
      nodeById.get(trimmed) || nodeByTitle.get(trimmed.toLowerCase());
    if (node) {
      const { id, title } = node.frontmatter;
      return `<a href="/node/${id}" data-node-link="${id}" class="node-link">${title}</a>`;
    }
    if (phantomIds.has(trimmed)) {
      const title = trimmed
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return `<a href="/node/${trimmed}" data-node-link="${trimmed}" class="node-link node-link-phantom">${title}</a>`;
    }
    return `<span class="node-link-broken">${trimmed}</span>`;
  });
}

const categories = JSON.parse(readFileSync(CATEGORIES_PATH, "utf-8"));
const categoryMap = new Map(categories.map((c) => [c.id, c]));
const nowIso = new Date().toISOString();

const files = readdirSync(CONTENT_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

// Pass 1 — parse frontmatter + content, compute dates
const parsed = files.map((filename) => {
  const filePath = path.join(CONTENT_DIR, filename);
  const raw = readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const slug = filename.replace(/\.md$/, "");
  const modified = lastCommitIso(filePath) ?? fileMtimeIso(filePath) ?? nowIso;
  const published = firstCommitIso(filePath) ?? modified;
  return { frontmatter: data, content, slug, publishedAt: published, updatedAt: modified };
});

// Pass 2 — build cross-ref lookup maps
const nodeById = new Map(parsed.map((n) => [n.frontmatter.id, n]));
const nodeByTitle = new Map(
  parsed.map((n) => [n.frontmatter.title.toLowerCase(), n])
);

// Pass 3 — build links (deduped bidirectionally) + phantom detection
const linkSet = new Set();
const links = [];
for (const node of parsed) {
  for (const conn of node.frontmatter.connections ?? []) {
    const key = [node.frontmatter.id, conn.target].sort().join("<->");
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push({
        source: node.frontmatter.id,
        target: conn.target,
        reason: conn.reason,
      });
    }
  }
}

const existingIds = new Set(parsed.map((n) => n.frontmatter.id));
const phantomIds = new Set();
for (const link of links) {
  if (!existingIds.has(link.target)) phantomIds.add(link.target);
  if (!existingIds.has(link.source)) phantomIds.add(link.source);
}

// Pass 4 — connection count per node (drives "val" / node size)
const connectionCount = new Map();
for (const link of links) {
  connectionCount.set(link.source, (connectionCount.get(link.source) ?? 0) + 1);
  connectionCount.set(link.target, (connectionCount.get(link.target) ?? 0) + 1);
}

// Pass 5 — compile HTML + write per-node content JSON
if (existsSync(CONTENT_OUT_DIR)) rmSync(CONTENT_OUT_DIR, { recursive: true });
mkdirSync(CONTENT_OUT_DIR, { recursive: true });

const metadataNodes = [];

for (const node of parsed) {
  const { frontmatter, content, slug, publishedAt, updatedAt } = node;
  let html = await markdownToHtml(content);
  html = resolveWikiLinks(html, nodeById, nodeByTitle, phantomIds);
  const cat = categoryMap.get(frontmatter.category);
  const id = frontmatter.id;

  writeFileSync(
    path.join(CONTENT_OUT_DIR, `${slug}.json`),
    JSON.stringify({ contentHtml: html })
  );

  metadataNodes.push({
    id,
    slug,
    title: frontmatter.title,
    category: frontmatter.category,
    color: cat?.color ?? "#666666",
    val: connectionCount.get(id) ?? 1,
    connections: frontmatter.connections ?? [],
    publishedAt,
    updatedAt,
    excerpt: getExcerpt(content),
  });
}

// Metadata for phantom nodes (no content file — they're just placeholders)
const phantomNodes = [...phantomIds].map((pid) => {
  const title = pid
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    id: pid,
    slug: pid,
    title,
    category: "phantom",
    color: "#666666",
    val: connectionCount.get(pid) ?? 1,
    connections: [],
    phantom: true,
  };
});

mkdirSync(path.dirname(METADATA_PATH), { recursive: true });
writeFileSync(
  METADATA_PATH,
  JSON.stringify({
    categories,
    nodes: metadataNodes,
    phantomNodes,
    links,
  })
);

console.log(
  `generate-content: ${metadataNodes.length} nodes (+ ${phantomNodes.length} phantom) · ` +
    `${links.length} links · metadata ${(statSync(METADATA_PATH).size / 1024).toFixed(1)} KB`
);
