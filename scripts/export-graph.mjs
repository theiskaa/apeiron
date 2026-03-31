import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force-3d";

const CONTENT_DIR = path.join(process.cwd(), "content", "nodes");
const CATEGORIES_PATH = path.join(process.cwd(), "content", "categories.json");
const OUTPUT_PATH = path.join(process.cwd(), "public", "apeirron-graph.svg");

const WIDTH = 3800;
const HEIGHT = 2000;

// Scale factor relative to 1200px base — all sizes proportional
const S = WIDTH / 1200;

const categories = JSON.parse(fs.readFileSync(CATEGORIES_PATH, "utf-8"));
const catMap = new Map(categories.map((c) => [c.id, c]));

const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
const nodesRaw = files.map((f) => {
  const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, f), "utf-8"));
  return data;
});

const linkSet = new Set();
const links = [];
for (const node of nodesRaw) {
  for (const conn of node.connections ?? []) {
    const key = [node.id, conn.target].sort().join("<->");
    if (!linkSet.has(key)) {
      linkSet.add(key);
      links.push({ source: node.id, target: conn.target });
    }
  }
}

const connCount = new Map();
for (const link of links) {
  connCount.set(link.source, (connCount.get(link.source) ?? 0) + 1);
  connCount.set(link.target, (connCount.get(link.target) ?? 0) + 1);
}

const nodes = nodesRaw.map((n) => ({
  id: n.id,
  title: n.title,
  category: n.category,
  color: catMap.get(n.category)?.color ?? "#666",
  val: connCount.get(n.id) ?? 1,
  radius: (Math.sqrt(connCount.get(n.id) ?? 1) * 4.5 + 3.5) * S,
}));

const nodeMap = new Map(nodes.map((n) => [n.id, n]));

const simLinks = links.map((l) => ({ ...l }));
const simNodes = nodes.map((n) => ({ ...n }));

const simulation = forceSimulation(simNodes)
  .force("charge", forceManyBody().strength(-250 * S * S).distanceMax(Infinity))
  .force("link", forceLink(simLinks).id((d) => d.id).distance(200 * S).strength(0.45))
  .force("center", forceCenter(WIDTH / 2, HEIGHT / 2).strength(0.05))
  .force("collide", forceCollide(45 * S))
  .stop();

for (let i = 0; i < 400; i++) simulation.tick();

let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const n of simNodes) {
  minX = Math.min(minX, n.x - n.radius);
  maxX = Math.max(maxX, n.x + n.radius);
  minY = Math.min(minY, n.y - n.radius);
  maxY = Math.max(maxY, n.y + n.radius);
}

const padding = 150;
const graphW = maxX - minX;
const graphH = maxY - minY;
const scale = Math.min((WIDTH - padding * 2) / graphW, (HEIGHT - padding * 2) / graphH);
const offsetX = (WIDTH - graphW * scale) / 2 - minX * scale;
const offsetY = (HEIGHT - graphH * scale) / 2 - minY * scale;

function tx(x) { return x * scale + offsetX; }
function ty(y) { return y * scale + offsetY; }

const svgLines = [];
svgLines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`);

for (const link of simLinks) {
  const s = typeof link.source === "object" ? link.source : nodeMap.get(link.source);
  const t = typeof link.target === "object" ? link.target : nodeMap.get(link.target);
  if (!s || !t) continue;
  svgLines.push(`  <line x1="${tx(s.x).toFixed(1)}" y1="${ty(s.y).toFixed(1)}" x2="${tx(t.x).toFixed(1)}" y2="${ty(t.y).toFixed(1)}" stroke="rgba(100,100,120,0.14)" stroke-width="${(2 * S * scale).toFixed(1)}" />`);
}

for (const n of simNodes) {
  const r = n.radius * scale;
  svgLines.push(`  <circle cx="${tx(n.x).toFixed(1)}" cy="${ty(n.y).toFixed(1)}" r="${r.toFixed(1)}" fill="${n.color}" />`);
}

for (const n of simNodes) {
  const r = n.radius * scale;
  const fontSize = 24;
  const gap = 8;
  svgLines.push(`  <text x="${tx(n.x).toFixed(1)}" y="${(ty(n.y) + r + fontSize + gap).toFixed(1)}" text-anchor="middle" font-family="Inter, -apple-system, system-ui, sans-serif" font-size="${fontSize}" font-weight="400" fill="rgba(40,40,50,0.5)">${escapeXml(n.title)}</text>`);
}

svgLines.push(`</svg>`);

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

fs.writeFileSync(OUTPUT_PATH, svgLines.join("\n"), "utf-8");
console.log(`Generated ${OUTPUT_PATH} (${WIDTH}x${HEIGHT}, ${nodes.length} nodes, ${links.length} links)`);
