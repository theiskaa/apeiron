import metadata from "./generated/graph-metadata.json";

interface GitDates {
  published: Date;
  modified: Date;
}

const _bySlug = new Map<string, GitDates>();
for (const n of (metadata as {
  nodes: Array<{ slug: string; publishedAt: string; updatedAt: string }>;
}).nodes) {
  _bySlug.set(n.slug, {
    published: new Date(n.publishedAt),
    modified: new Date(n.updatedAt),
  });
}

export function getNodeGitDates(slug: string): GitDates {
  const entry = _bySlug.get(slug);
  if (entry) return entry;
  const now = new Date();
  return { published: now, modified: now };
}
