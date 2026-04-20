import type { Metadata } from "next";
import { getAllNodes, getCategories } from "@/lib/content";
import NodesView from "@/components/NodesView";

export const metadata: Metadata = {
  title: "All nodes — Apeirron",
  description:
    "Every topic in the Apeirron knowledge graph, grouped by category — consciousness, ancient civilizations, intelligence operations, reality, and more.",
  alternates: { canonical: "/nodes" },
  openGraph: {
    title: "All nodes — Apeirron",
    description:
      "Every topic in the Apeirron knowledge graph, grouped by category.",
    type: "website",
    siteName: "Apeirron",
  },
};

export default function NodesIndexPage() {
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

  const groups = categories
    .filter((c) => byCategory.has(c.id))
    .map((category) => ({
      category,
      nodes: byCategory.get(category.id)!.map((n) => ({
        id: n.frontmatter.id,
        title: n.frontmatter.title,
      })),
    }));

  return <NodesView groups={groups} totalCount={nodes.length} />;
}
