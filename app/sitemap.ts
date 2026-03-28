import type { MetadataRoute } from "next";
import { getAllNodes } from "@/lib/content";

const BASE_URL = "https://apeirron.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const nodes = getAllNodes();

  const nodeEntries = nodes.map((node) => ({
    url: `${BASE_URL}/node/${node.frontmatter.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...nodeEntries,
  ];
}
