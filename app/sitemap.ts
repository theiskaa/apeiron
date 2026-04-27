import type { MetadataRoute } from "next";
import { getAllNodes } from "@/lib/content";
import { getNodeGitDates } from "@/lib/git-dates";

const BASE_URL = "https://www.apeirron.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const nodes = getAllNodes();

  const nodeEntries = nodes.map((node) => ({
    url: `${BASE_URL}/node/${node.frontmatter.id}`,
    lastModified: getNodeGitDates(node.slug).modified,
  }));

  const latest = nodeEntries.reduce<Date>((acc, entry) => {
    const d = entry.lastModified as Date;
    return d > acc ? d : acc;
  }, new Date(0));
  const rootMtime = latest.getTime() > 0 ? latest : new Date();

  return [
    { url: `${BASE_URL}/`, lastModified: rootMtime },
    { url: `${BASE_URL}/about`, lastModified: rootMtime },
    { url: `${BASE_URL}/nodes`, lastModified: rootMtime },
    { url: `${BASE_URL}/books`, lastModified: rootMtime },
    { url: `${BASE_URL}/contribute`, lastModified: rootMtime },
    ...nodeEntries,
  ];
}
