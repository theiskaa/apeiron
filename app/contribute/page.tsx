import { getCategories, getAllNodes } from "@/lib/content";
import ContributeForm from "@/components/ContributeForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribute — Apeirron",
  description: "Propose a new node for the Apeirron knowledge graph.",
};

interface Props {
  searchParams: Promise<{ node?: string }>;
}

export default async function ContributePage({ searchParams }: Props) {
  const { node: nodeId } = await searchParams;
  const categories = getCategories();
  const allNodes = getAllNodes();
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const nodeList = allNodes.map((n) => ({
    id: n.frontmatter.id,
    title: n.frontmatter.title,
    color: categoryMap.get(n.frontmatter.category)?.color ?? "#666666",
  }));

  // Pre-fill title if coming from a phantom node
  let prefillTitle = "";
  if (nodeId) {
    const existing = allNodes.find((n) => n.frontmatter.id === nodeId);
    if (existing) {
      prefillTitle = existing.frontmatter.title;
    } else {
      prefillTitle = nodeId
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  return (
    <ContributeForm
      categories={categories}
      nodeList={nodeList}
      prefillTitle={prefillTitle}
      prefillNodeId={nodeId}
    />
  );
}
