import Link from "next/link";
import { buildGraphData, getAllNodes, getCategories } from "@/lib/content";
import PageClient from "@/components/PageClient";

const BASE_URL = "https://www.apeirron.com";

export default async function Home() {
  const graphData = await buildGraphData();
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
  const orderedCategories = categories.filter((c) => byCategory.has(c.id));

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: "Apeirron",
    url: `${BASE_URL}/`,
    description:
      "An open-source knowledge graph mapping the biggest questions humanity asks — consciousness, ancient civilizations, intelligence operations, and the nature of reality.",
    inLanguage: "en",
    publisher: { "@id": `${BASE_URL}/#organization` },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "Apeirron",
    url: `${BASE_URL}/`,
    description:
      "An open-source collaborative project building a knowledge graph of humanity's biggest questions. Every idea is a node; every connection has a reason.",
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/og.jpg`,
      width: 1200,
      height: 630,
    },
    sameAs: ["https://github.com/theiskaa/apeirron"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <PageClient graphData={graphData} />

      {/*
        Semantic content block for screen readers and search engines. The
        interactive graph above is a canvas UI that isn't directly accessible
        via keyboard navigation or static crawling, so this block provides:
        (1) an accessible index of every node, (2) crawler-discoverable
        internal links, (3) the site's tagline and purpose in text form.
        Rendered with `sr-only` (visually hidden, semantically preserved).
      */}
      <main className="sr-only" aria-label="Apeirron — knowledge graph index">
        <h1>Apeirron — Biggest questions humanity asks</h1>
        <p>
          An open-source knowledge graph mapping the biggest questions humanity
          asks — consciousness, ancient civilizations, intelligence operations,
          and the nature of reality. Each node is a self-contained
          investigation; every connection between nodes has a documented
          reason. {nodes.length} nodes across {orderedCategories.length}{" "}
          categories.
        </p>
        <nav aria-label="Primary">
          <ul>
            <li>
              <Link href="/nodes">Browse all {nodes.length} nodes</Link>
            </li>
            <li>
              <Link href="/about">About Apeirron — editorial standards, sourcing, governance</Link>
            </li>
            <li>
              <Link href="/contribute">Contribute a new node</Link>
            </li>
            <li>
              <a href="/llms.txt">Machine-readable index (llms.txt)</a>
            </li>
            <li>
              <a
                href="https://github.com/theiskaa/apeirron"
                rel="noopener noreferrer"
              >
                Source code on GitHub
              </a>
            </li>
          </ul>
        </nav>
        {orderedCategories.map((cat) => (
          <section key={cat.id} aria-labelledby={`sr-category-${cat.id}`}>
            <h2 id={`sr-category-${cat.id}`}>{cat.label}</h2>
            <ul>
              {byCategory.get(cat.id)!.map((node) => (
                <li key={node.frontmatter.id}>
                  <Link href={`/node/${node.frontmatter.id}`}>
                    {node.frontmatter.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
