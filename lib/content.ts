import fs from "node:fs";
import path from "node:path";
import type {
  NodeData,
  NodeFrontmatter,
  Category,
  GraphData,
  GraphNode,
  GraphLink,
  NodeConnection,
} from "./types";
import metadata from "./generated/graph-metadata.json";

/**
 * The generated metadata blob. Shape mirrors scripts/generate-content.mjs.
 * Node metadata contains no contentHtml — that lives in public/content/<slug>.json
 * and is loaded on demand via getNodeContent().
 */
interface MetadataNode {
  id: string;
  slug: string;
  title: string;
  category: string;
  color: string;
  val: number;
  connections: NodeConnection[];
  publishedAt: string;
  updatedAt: string;
  excerpt: string;
}

interface MetadataPhantom {
  id: string;
  slug: string;
  title: string;
  category: "phantom";
  color: string;
  val: number;
  connections: NodeConnection[];
  phantom: true;
}

interface Metadata {
  categories: Category[];
  nodes: MetadataNode[];
  phantomNodes: MetadataPhantom[];
  links: GraphLink[];
}

const _meta = metadata as unknown as Metadata;

export function getCategories(): Category[] {
  return _meta.categories;
}

/** Lightweight: only frontmatter. */
export function getAllNodeFrontmatters(): NodeFrontmatter[] {
  return _meta.nodes.map((n) => ({
    id: n.id,
    title: n.title,
    category: n.category,
    connections: n.connections,
  }));
}

/**
 * Node data without content — matches the legacy shape, but `content` is now
 * empty for metadata-only consumers. Use `getNodeContent(slug)` to fetch the
 * compiled HTML for a specific node.
 */
export function getAllNodes(): NodeData[] {
  return _meta.nodes.map((n) => ({
    frontmatter: {
      id: n.id,
      title: n.title,
      category: n.category,
      connections: n.connections,
    },
    content: "",
    slug: n.slug,
  }));
}

/** Look up a node's excerpt for metadata tags (description, llms.txt). */
export function getNodeExcerpt(slug: string): string {
  return _meta.nodes.find((n) => n.slug === slug)?.excerpt ?? "";
}

export function getPhantomNodeIds(): string[] {
  return _meta.phantomNodes.map((p) => p.id);
}

let _graphDataCache: GraphData | null = null;

/**
 * Builds metadata-only graph data — no contentHtml.
 * Intentionally lightweight so it can be passed as a prop to the client.
 */
export async function buildGraphData(): Promise<GraphData> {
  if (_graphDataCache) return _graphDataCache;

  const nodes: GraphNode[] = _meta.nodes.map((n) => ({
    id: n.id,
    title: n.title,
    category: n.category,
    color: n.color,
    val: n.val,
    publishedAt: n.publishedAt,
    updatedAt: n.updatedAt,
  }));

  for (const p of _meta.phantomNodes) {
    nodes.push({
      id: p.id,
      title: p.title,
      category: p.category,
      color: p.color,
      val: p.val,
      phantom: true,
    });
  }

  _graphDataCache = { nodes, links: _meta.links };
  return _graphDataCache;
}

/**
 * Load a single node's compiled HTML. Only called during SSG / at runtime for
 * the active node. Tries filesystem first (fast during `next build`), falls
 * back to an absolute fetch (Cloudflare Workers runtime where fs is absent).
 */
export async function getNodeContent(slug: string): Promise<string> {
  const rel = path.posix.join("content", `${slug}.json`);

  // Build-time / Node environments: read from public/ on disk.
  try {
    const abs = path.join(process.cwd(), "public", rel);
    if (fs.existsSync(abs)) {
      const raw = fs.readFileSync(abs, "utf-8");
      const parsed = JSON.parse(raw) as { contentHtml: string };
      return parsed.contentHtml ?? "";
    }
  } catch {
    // fs unavailable — fall through to ASSETS fetch
  }

  // Runtime on Cloudflare Worker: load from the ASSETS binding.
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const assets = (env as { ASSETS?: { fetch: (req: Request) => Promise<Response> } } | undefined)?.ASSETS;
    if (assets && typeof assets.fetch === "function") {
      const res = await assets.fetch(
        new Request(`https://assets.local/${rel}`)
      );
      if (res.ok) {
        const { contentHtml } = (await res.json()) as { contentHtml: string };
        return contentHtml ?? "";
      }
    }
  } catch {
    // getCloudflareContext only exists in @opennextjs/cloudflare environments
  }

  return "";
}
