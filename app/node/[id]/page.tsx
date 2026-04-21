import { notFound } from "next/navigation";
import {
  getAllNodes,
  getNodeExcerpt,
  buildGraphData,
  getCategories,
  getPhantomNodeIds,
  getNodeContent,
} from "@/lib/content";
import { getNodeGitDates } from "@/lib/git-dates";
import type { Metadata } from "next";
import PageClient from "@/components/PageClient";

const BASE_URL = "https://www.apeirron.com";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const nodes = getAllNodes();
  const phantomIds = getPhantomNodeIds();
  return [
    ...nodes.map((node) => ({ id: node.frontmatter.id })),
    ...phantomIds.map((id) => ({ id })),
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const nodes = getAllNodes();
  const node = nodes.find((n) => n.frontmatter.id === id);

  if (!node) {
    // Could be a phantom node
    const phantomIds = getPhantomNodeIds();
    if (phantomIds.includes(id)) {
      const title = id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return {
        title: `${title} — Apeirron`,
        description: `${title} is a proposed topic in the Apeirron knowledge graph. Contribute to help build this node.`,
        alternates: { canonical: `/node/${id}` },
      };
    }
    return { title: "Not Found — Apeirron" };
  }

  const categories = getCategories();
  const category = categories.find(
    (c) => c.id === node.frontmatter.category
  );
  const description = getNodeExcerpt(node.slug);
  const title = `${node.frontmatter.title} — Apeirron`;
  const dates = getNodeGitDates(node.slug);

  return {
    title,
    description,
    alternates: { canonical: `/node/${id}` },
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Apeirron",
      publishedTime: dates.published.toISOString(),
      modifiedTime: dates.modified.toISOString(),
      tags: [
        category?.label ?? node.frontmatter.category,
        "knowledge graph",
        "deep dive",
        ...node.frontmatter.connections.map((c) => c.target),
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: node.frontmatter.title,
      description,
    },
  };
}

export default async function NodePage({ params }: Props) {
  const { id } = await params;
  const graphData = await buildGraphData();
  const graphNode = graphData.nodes.find((n) => n.id === id);

  if (!graphNode) notFound();

  const sourceNode = getAllNodes().find((n) => n.frontmatter.id === id);
  const categories = getCategories();
  const category = categories.find((c) => c.id === graphNode.category);
  const description = sourceNode ? getNodeExcerpt(sourceNode.slug) : "";

  const dates = sourceNode ? getNodeGitDates(sourceNode.slug) : null;
  const activeContent = graphNode.phantom ? "" : await getNodeContent(id);
  const connectedIds = graphData.links
    .filter((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
      const t = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
      return s === id || t === id;
    })
    .map((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
      const t = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
      return s === id ? t : s;
    });

  const article: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${BASE_URL}/node/${id}#article`,
    headline: graphNode.title,
    description,
    url: `${BASE_URL}/node/${id}`,
    mainEntityOfPage: `${BASE_URL}/node/${id}`,
    inLanguage: "en",
    isPartOf: { "@id": `${BASE_URL}/#website` },
    publisher: { "@id": `${BASE_URL}/#organization` },
    author: { "@id": `${BASE_URL}/#organization` },
    image: {
      "@type": "ImageObject",
      url: `${BASE_URL}/og.jpg`,
      width: 1200,
      height: 630,
    },
    about: {
      "@type": "Thing",
      name: category?.label ?? graphNode.category,
    },
    keywords: [category?.label ?? graphNode.category, ...connectedIds],
  };

  if (dates) {
    article.datePublished = dates.published.toISOString();
    article.dateModified = dates.modified.toISOString();
  }

  const breadcrumbs = {
    "@type": "BreadcrumbList",
    "@id": `${BASE_URL}/node/${id}#breadcrumbs`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${BASE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category?.label ?? graphNode.category,
        item: `${BASE_URL}/nodes#category-${graphNode.category}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: graphNode.title,
        item: `${BASE_URL}/node/${id}`,
      },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [article, breadcrumbs],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageClient
        graphData={graphData}
        initialNodeId={id}
        initialContent={
          activeContent
            ? { nodeId: id, contentHtml: activeContent }
            : undefined
        }
      />
    </>
  );
}
