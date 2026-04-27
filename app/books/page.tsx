import type { Metadata } from "next";
import BooksView from "@/components/BooksView";
import { getCategories, getAllNodeFrontmatters } from "@/lib/content";

const BASE_URL = "https://www.apeirron.com";

// Subject blurbs per category. Hardcoded rather than derived because
// the description is editorial, not generated — it is what reads on
// the cover card next to the volume label.
const VOLUME_DESCRIPTIONS: Record<string, string> = {
  mind: "Consciousness, philosophy of mind, altered states, philosophical traditions.",
  origins: "Pre-history, lost civilizations, ancient mysteries, esoteric tradition.",
  cosmos: "UFOs, UAPs, the Fermi paradox, the Pentagon disclosure arc.",
  power: "Hidden power structures, secret societies, the deep state, dynastic finance.",
  operations: "Documented intelligence operations, assassinations, false flags.",
  modern: "Twenty-first-century cases, contested deaths, contemporary disinformation.",
  reality: "Foundational physics, the Mandela effect, the simulation hypothesis, flat-earth epistemology.",
};

export const metadata: Metadata = {
  title: "Apeirron Series",
  description:
    "The apeirron knowledge graph as a typeset edition: seven EPUB and PDF volumes, one per category, downloadable directly from GitHub.",
  alternates: { canonical: "/books" },
  openGraph: {
    title: "Apeirron Series",
    description:
      "Seven typeset volumes of the apeirron knowledge graph, organized by category. EPUB and PDF, downloaded from GitHub.",
    type: "website",
    siteName: "Apeirron",
  },
};

export default function BooksPage() {
  const categories = getCategories();
  const frontmatters = getAllNodeFrontmatters();

  // Count nodes per category. Categories with zero nodes are dropped
  // so a future category added to categories.json without any nodes
  // does not surface as an empty card.
  const counts = new Map<string, number>();
  for (const fm of frontmatters) {
    counts.set(fm.category, (counts.get(fm.category) ?? 0) + 1);
  }

  const volumes = categories
    .map((c) => ({
      id: c.id,
      label: c.label,
      description: VOLUME_DESCRIPTIONS[c.id] ?? "",
      chapters: counts.get(c.id) ?? 0,
    }))
    .filter((v) => v.chapters > 0);

  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${BASE_URL}/books#collectionpage`,
    url: `${BASE_URL}/books`,
    name: "Apeirron Series",
    description:
      "Seven typeset volumes derived from the apeirron knowledge graph, organized by category.",
    isPartOf: { "@id": `${BASE_URL}/#website` },
    inLanguage: "en",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }}
      />
      <BooksView volumes={volumes} />
    </>
  );
}
