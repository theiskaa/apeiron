import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const CONTENT_DIR = path.join(process.cwd(), "content", "nodes");

interface GitDates {
  published: Date;
  modified: Date;
}

const cache = new Map<string, GitDates>();

export function getNodeGitDates(slug: string): GitDates {
  const cached = cache.get(slug);
  if (cached) return cached;

  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  const modified = readLastCommitDate(filePath) ?? readFileMtime(filePath) ?? new Date();
  const published = readFirstCommitDate(filePath) ?? modified;

  const result = { published, modified };
  cache.set(slug, result);
  return result;
}

function readLastCommitDate(filePath: string): Date | null {
  try {
    const iso = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (iso) return new Date(iso);
  } catch {}
  return null;
}

function readFirstCommitDate(filePath: string): Date | null {
  try {
    const output = execSync(
      `git log --diff-filter=A --follow --format=%cI -- "${filePath}"`,
      { stdio: ["ignore", "pipe", "ignore"] }
    )
      .toString()
      .trim();
    const lines = output.split("\n").filter(Boolean);
    const first = lines[lines.length - 1];
    if (first) return new Date(first);
  } catch {}
  return null;
}

function readFileMtime(filePath: string): Date | null {
  try {
    return fs.statSync(filePath).mtime;
  } catch {}
  return null;
}
