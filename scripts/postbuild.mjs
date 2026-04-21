// Runs automatically after `next build` (pnpm lifecycle). Produces the
// OpenNext bundle under .open-next/ so that downstream `wrangler deploy` has
// the Worker + assets ready to upload.
//
// opennextjs-cloudflare internally invokes `pnpm run build`, which re-enters
// this script. The env-var guard breaks the recursion — the inner invocation
// is a no-op.

if (process.env.OPENNEXT_INSIDE_BUILD) {
  process.exit(0);
}

const { spawnSync } = await import("node:child_process");
const result = spawnSync("pnpm", ["exec", "opennextjs-cloudflare", "build"], {
  stdio: "inherit",
  env: { ...process.env, OPENNEXT_INSIDE_BUILD: "1" },
});
process.exit(result.status ?? 0);
