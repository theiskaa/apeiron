import type { Metadata } from "next";
import AboutView from "@/components/AboutView";
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
  title: "About — Apeirron",
  description:
    "How Apeirron is written, sourced, and governed. Editorial standards for mapping contested ideas: present both sides, show your work, treat every topic seriously. Open source, community-driven, Markdown-native. Includes the Apeirron Series — seven typeset volumes available as EPUB and PDF.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — Apeirron",
    description:
      "Editorial standards, sourcing requirements, governance, and the typeset book series for an open-source knowledge graph of humanity's biggest questions.",
    type: "website",
    siteName: "Apeirron",
  },
};

export default function AboutPage() {
  const categories = getCategories();
  const frontmatters = getAllNodeFrontmatters();

  // Categories with zero nodes are dropped so a future category added to
  // categories.json without any nodes does not surface as an empty card.
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

  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${BASE_URL}/about#aboutpage`,
    url: `${BASE_URL}/about`,
    name: "About Apeirron",
    description:
      "Editorial standards, sourcing requirements, and governance for Apeirron — an open-source knowledge graph of contested ideas.",
    isPartOf: { "@id": `${BASE_URL}/#website` },
    mainEntity: { "@id": `${BASE_URL}/#organization` },
    inLanguage: "en",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      <AboutView volumes={volumes} />
    </>
  );
}
