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

export function getAllNodes(): NodeData[] {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  return files.map((filename) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf-8");
    const { data, content } = matter(raw);
    return {
      frontmatter: data as NodeFrontmatter,
      content,
      slug: filename.replace(/\.md$/, ""),
    };
  });
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
  nodeByTitle: Map<string, NodeData>
): string {
  return html.replace(/\[\[([^\]]+)\]\]/g, (_match, ref: string) => {
    const trimmed = ref.trim();
    const node = nodeById.get(trimmed) || nodeByTitle.get(trimmed.toLowerCase());
    if (node) {
      const { id, title } = node.frontmatter;
      return `<a data-node-link="${id}" class="node-link">${title}</a>`;
    }
    // No match found — render as plain text with a broken-link style
    return `<span class="node-link-broken">${trimmed}</span>`;
  });
}

export async function buildGraphData(): Promise<GraphData> {
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
      contentHtml = resolveWikiLinks(contentHtml, nodeById, nodeByTitle);
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

  return { nodes: graphNodes, links };
}
