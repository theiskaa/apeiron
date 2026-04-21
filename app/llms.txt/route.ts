import { getAllNodes, getCategories, getNodeExcerpt } from "@/lib/content";

export const dynamic = "force-static";

const BASE_URL = "https://www.apeirron.com";

export async function GET() {
  const nodes = getAllNodes();
  const categories = getCategories();

  const byCategory = new Map<string, typeof nodes>();
  for (const node of nodes) {
    const key = node.frontmatter.category;
    const list = byCategory.get(key) ?? [];
    list.push(node);
    byCategory.set(key, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));
  }

  const sections = categories
    .filter((cat) => byCategory.has(cat.id))
    .map((cat) => {
      const list = byCategory.get(cat.id)!;
      const lines = list.map((node) => {
        const excerpt = getNodeExcerpt(node.slug);
        return `- [${node.frontmatter.title}](${BASE_URL}/node/${node.frontmatter.id}): ${excerpt}`;
      });
      return `## ${cat.label}\n\n${lines.join("\n")}`;
    });

  const body = `# Apeirron

> An open-source knowledge graph mapping the biggest questions humanity asks — consciousness, ancient civilizations, intelligence operations, reality, and more. Every idea is a node; every connection has a reason.

Each node below is a self-contained investigation, primary-sourced and interlinked with related topics in the graph. The full graph of ${nodes.length} nodes is browsable at ${BASE_URL}.

## About

- Homepage: ${BASE_URL}
- About / editorial standards: ${BASE_URL}/about
- Full node index: ${BASE_URL}/nodes
- Contribute: ${BASE_URL}/contribute
- Source code: https://github.com/theiskaa/apeirron
- Sitemap: ${BASE_URL}/sitemap.xml

${sections.join("\n\n")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
