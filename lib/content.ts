import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import type {
  NodeData,
  NodeFrontmatter,
  Category,
  GraphData,
  GraphNode,
  GraphLink,
} from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "nodes");
const CATEGORIES_PATH = path.join(process.cwd(), "content", "categories.json");

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeStringify);

async function markdownToHtml(md: string): Promise<string> {
  const result = await markdownProcessor.process(md);
  return result.toString();
}

export function getCategories(): Category[] {
  const raw = fs.readFileSync(CATEGORIES_PATH, "utf-8");
  return JSON.parse(raw);
}

let _frontmatterCache: NodeFrontmatter[] | null = null;

/** Lightweight: only parses frontmatter, skips content. */
export function getAllNodeFrontmatters(): NodeFrontmatter[] {
  if (_frontmatterCache) return _frontmatterCache;
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  _frontmatterCache = files.map((filename) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf-8");
    const { data } = matter(raw);
    return data as NodeFrontmatter;
  });
  return _frontmatterCache;
}

let _allNodesCache: NodeData[] | null = null;

export function getAllNodes(): NodeData[] {
  if (_allNodesCache) return _allNodesCache;
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  _allNodesCache = files.map((filename) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf-8");
    const { data, content } = matter(raw);
    return {
      frontmatter: data as NodeFrontmatter,
      content,
      slug: filename.replace(/\.md$/, ""),
    };
  });
  return _allNodesCache;
}

/** Extract a plain-text excerpt from markdown for meta descriptions. */
export function getExcerpt(markdown: string, maxLength = 160): string {
  return markdown
    .replace(/\[\[([^\]]+)\]\]/g, "$1") // strip wiki links
    .replace(/^---[\s\S]*?---\s*/m, "") // strip frontmatter
    .replace(/^#{1,6}\s+.*$/gm, "") // strip headings
    .replace(/\*\*([^*]+)\*\*/g, "$1") // strip bold
    .replace(/\*([^*]+)\*/g, "$1") // strip italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip markdown links
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, maxLength)
    .replace(/\s+\S*$/, "…"); // cut at word boundary
}

/**
 * Resolve [[wiki links]] in HTML content.
 * Supports [[node-id]] and [[Node Title]] formats.
 * Converts to <a data-node-link="id" class="node-link">Title</a>
 */
function resolveWikiLinks(
  html: string,
  nodeById: Map<string, NodeData>,
  nodeByTitle: Map<string, NodeData>,
  phantomIds?: Set<string>
): string {
  return html.replace(/\[\[([^\]]+)\]\]/g, (_match, ref: string) => {
    const trimmed = ref.trim();
    const node = nodeById.get(trimmed) || nodeByTitle.get(trimmed.toLowerCase());
    if (node) {
      const { id, title } = node.frontmatter;
      return `<a href="/node/${id}" data-node-link="${id}" class="node-link">${title}</a>`;
    }
    if (phantomIds?.has(trimmed)) {
      const title = trimmed
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return `<a href="/node/${trimmed}" data-node-link="${trimmed}" class="node-link node-link-phantom">${title}</a>`;
    }
    // No match found — render as plain text with a broken-link style
    return `<span class="node-link-broken">${trimmed}</span>`;
  });
}

let _graphDataCache: GraphData | null = null;

export async function buildGraphData(): Promise<GraphData> {
  if (_graphDataCache) return _graphDataCache;
  const nodes = getAllNodes();
  const categories = getCategories();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Build lookup maps for wiki link resolution
  const nodeById = new Map(nodes.map((n) => [n.frontmatter.id, n]));
  const nodeByTitle = new Map(
    nodes.map((n) => [n.frontmatter.title.toLowerCase(), n])
  );

  // Deduplicate bidirectional links using sorted canonical keys
  const linkSet = new Set<string>();
  const links: GraphLink[] = [];

  for (const node of nodes) {
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

  // Detect phantom nodes — referenced in connections but no .md file exists
  const existingIds = new Set(nodes.map((n) => n.frontmatter.id));
  const phantomIds = new Set<string>();
  for (const link of links) {
    if (!existingIds.has(link.target)) phantomIds.add(link.target);
    if (!existingIds.has(link.source)) phantomIds.add(link.source);
  }

  const connectionCount = new Map<string, number>();
  for (const link of links) {
    connectionCount.set(
      link.source,
      (connectionCount.get(link.source) ?? 0) + 1
    );
    connectionCount.set(
      link.target,
      (connectionCount.get(link.target) ?? 0) + 1
    );
  }

  // Build graph nodes with compiled HTML content + resolved wiki links
  const graphNodes: GraphNode[] = await Promise.all(
    nodes.map(async (node) => {
      const cat = categoryMap.get(node.frontmatter.category);
      let contentHtml = await markdownToHtml(node.content);
      contentHtml = resolveWikiLinks(contentHtml, nodeById, nodeByTitle, phantomIds);
      return {
        id: node.frontmatter.id,
        title: node.frontmatter.title,
        category: node.frontmatter.category,
        color: cat?.color ?? "#666666",
        val: connectionCount.get(node.frontmatter.id) ?? 1,
        contentHtml,
      };
    })
  );

  // Create phantom graph nodes
  for (const pid of phantomIds) {
    const title = pid
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    graphNodes.push({
      id: pid,
      title,
      category: "phantom",
      color: "#666666",
      val: connectionCount.get(pid) ?? 1,
      contentHtml: "",
      phantom: true,
    });
  }

  _graphDataCache = { nodes: graphNodes, links };
  return _graphDataCache;
}

export function getPhantomNodeIds(): string[] {
  const nodes = getAllNodes();
  const existingIds = new Set(nodes.map((n) => n.frontmatter.id));
  const phantomIds = new Set<string>();
  for (const node of nodes) {
    for (const conn of node.frontmatter.connections ?? []) {
      if (!existingIds.has(conn.target)) phantomIds.add(conn.target);
    }
  }
  return [...phantomIds];
}

/**
 * Build a lightweight version of graph data where only the specified node
 * has its full HTML content. All other nodes get contentHtml stripped to
 * save memory on mobile (Safari iOS kills pages that use too much RAM).
 */
export async function buildGraphDataForNode(activeNodeId: string): Promise<GraphData> {
  const full = await buildGraphData();
  return {
    links: full.links,
    nodes: full.nodes.map((n) => ({
      ...n,
      contentHtml: n.id === activeNodeId ? n.contentHtml : "",
    })),
  };
}
