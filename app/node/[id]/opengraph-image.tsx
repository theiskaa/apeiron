import { ImageResponse } from "next/og";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceCenter,
} from "d3-force";
import {
  buildGraphData,
  getCategories,
  getPhantomNodeIds,
} from "@/lib/content";

export const alt = "Apeirron — Biggest questions humanity asks";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const graph = await buildGraphData();
  const node = graph.nodes.find((n) => n.id === id);
  return [
    {
      id: "default",
      alt: node ? `${node.title} — Apeirron` : alt,
      contentType,
      size,
    },
  ];
}

interface Props {
  params: Promise<{ id: string }>;
}

const CANVAS_W = 1200;
const CANVAS_H = 630;
const GRID = 40;

const BG = "#f8f8fa";
const GRID_COLOR = "rgba(0, 0, 0, 0.055)";
const LINE_COLOR = "rgba(100, 100, 120, 0.3)";
const LABEL_COLOR = "rgba(40, 40, 50, 0.62)";
const FOCAL_LABEL_COLOR = "rgba(20, 20, 30, 0.92)";
const TITLE_COLOR = "#1a1a1e";
const CATEGORY_TEXT_COLOR = "#5a5a6e";
const RING_COLOR = "rgba(40, 40, 50, 0.35)";
const PHANTOM_RING_COLOR = "rgba(40, 40, 50, 0.4)";

const PAD_X = 40;
const PAD_TOP = 28;
const PAD_BOTTOM = 32;
const CATEGORY_H = 26;
const CATEGORY_GAP = 6;
const TITLE_AREA_H = 104;
const TITLE_GAP = 8;

const GRAPH_X = PAD_X;
const GRAPH_Y = PAD_TOP + CATEGORY_H + CATEGORY_GAP;
const GRAPH_W = CANVAS_W - PAD_X * 2;
const GRAPH_H =
  CANVAS_H -
  PAD_TOP -
  CATEGORY_H -
  CATEGORY_GAP -
  TITLE_GAP -
  TITLE_AREA_H -
  PAD_BOTTOM;

const FOCAL_TARGET_X = GRAPH_W * 0.68;
const FOCAL_TARGET_Y = GRAPH_H * 0.42;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function truncateLabel(s: string, max: number): string {
  if (max <= 3) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function densityMult(n: number): number {
  if (n > 25) return 0.7;
  if (n > 15) return 0.85;
  return 1;
}

function radiusFor(val: number, isFocal: boolean, mult = 1): number {
  const base = (Math.sqrt(Math.max(1, val)) * 3 + 4) * mult;
  return isFocal
    ? clamp(base + 2.5, 11, 20)
    : clamp(base, 5, 15);
}

function idHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

function hashUnit(s: string, salt: number): number {
  const h = idHash(`${s}:${salt}`);
  return (h & 0xffffff) / 0xffffff;
}

interface SimNode {
  id: string;
  title: string;
  color: string;
  val: number;
  phantom?: boolean;
  isFocal: boolean;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export default async function OpenGraphImage({ params }: Props) {
  const { id } = await params;
  const graph = await buildGraphData();
  const categories = getCategories();
  const node = graph.nodes.find((n) => n.id === id);

  let title: string;
  let categoryLabel: string;
  let categoryColor = "#888888";
  let focalColor = "#888888";
  let focalVal = 6;
  let focalIsPhantom = false;

  if (node) {
    title = node.title;
    const cat = categories.find((c) => c.id === node.category);
    categoryLabel = cat?.label ?? node.category;
    categoryColor = cat?.color ?? categoryColor;
    focalColor = node.color;
    focalVal = node.val;
    focalIsPhantom = !!node.phantom;
  } else {
    const phantomIds = getPhantomNodeIds();
    if (phantomIds.includes(id)) {
      title = id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      categoryLabel = "Proposed";
    } else {
      title = "Apeirron";
      categoryLabel = "Knowledge Graph";
    }
  }

  const neighborIdSet = new Set<string>();
  for (const link of graph.links) {
    if (link.source === id) neighborIdSet.add(link.target);
    else if (link.target === id) neighborIdSet.add(link.source);
  }
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const neighbors = [...neighborIdSet]
    .map((nid) => nodeMap.get(nid))
    .filter((n): n is NonNullable<typeof n> => !!n);
  neighbors.sort((a, b) => b.val - a.val || a.id.localeCompare(b.id));

  const dMult = densityMult(neighbors.length);
  const labelFontSize = neighbors.length > 25 ? 11 : neighbors.length > 15 ? 12 : 13;
  const focalLabelFontSize = neighbors.length > 25 ? 15 : neighbors.length > 15 ? 16 : 17;

  const included = new Set<string>([id, ...neighbors.map((n) => n.id)]);

  const seenEdges = new Set<string>();
  const subgraphLinks: { source: string; target: string }[] = [];
  for (const link of graph.links) {
    if (!included.has(link.source) || !included.has(link.target)) continue;
    const key =
      link.source < link.target
        ? `${link.source}|${link.target}`
        : `${link.target}|${link.source}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    subgraphLinks.push({ source: link.source, target: link.target });
  }

  const cx0 = GRAPH_W / 2;
  const cy0 = GRAPH_H / 2;
  const simNodes: SimNode[] = [
    {
      id,
      title,
      color: focalColor,
      val: focalVal,
      phantom: focalIsPhantom,
      isFocal: true,
      x: cx0,
      y: cy0,
    },
    ...neighbors.map((n) => {
      const ax = hashUnit(n.id, 1);
      const ay = hashUnit(n.id, 2);
      return {
        id: n.id,
        title: n.title,
        color: n.color,
        val: n.val,
        phantom: n.phantom,
        isFocal: false,
        x: cx0 + (ax - 0.5) * 120,
        y: cy0 + (ay - 0.5) * 90,
      };
    }),
  ];

  const chargeStrength =
    neighbors.length > 25
      ? -700
      : neighbors.length > 15
        ? -540
        : -420;
  const linkDistanceVal =
    neighbors.length > 25
      ? 145
      : neighbors.length > 15
        ? 128
        : 115;
  const collidePad = neighbors.length > 25 ? 9 : 7;

  const sim = forceSimulation(simNodes as unknown as d3Node[])
    .force(
      "charge",
      forceManyBody().strength(chargeStrength).distanceMax(650)
    )
    .force(
      "link",
      forceLink(subgraphLinks as unknown as d3Link[])
        .id((d) => (d as unknown as { id: string }).id)
        .distance(linkDistanceVal)
        .strength(0.32)
    )
    .force(
      "collide",
      forceCollide()
        .radius(
          (d) =>
            radiusFor(
              (d as unknown as SimNode).val,
              (d as unknown as SimNode).isFocal,
              dMult
            ) + collidePad
        )
        .strength(1)
        .iterations(2)
    )
    .force("center", forceCenter(cx0, cy0).strength(0.04))
    .stop();

  for (let i = 0; i < 800; i++) sim.tick();

  const focalNode = simNodes[0];

  const MARGIN_X = 24;
  const MARGIN_TOP = 22;
  const MARGIN_BOTTOM = 44;
  const availableW = GRAPH_W - MARGIN_X * 2;
  const availableH = GRAPH_H - MARGIN_TOP - MARGIN_BOTTOM;

  const bbox = () => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of simNodes) {
      const r = radiusFor(n.val, n.isFocal, dMult);
      minX = Math.min(minX, (n.x ?? 0) - r);
      maxX = Math.max(maxX, (n.x ?? 0) + r);
      minY = Math.min(minY, (n.y ?? 0) - r);
      maxY = Math.max(maxY, (n.y ?? 0) + r);
    }
    return { minX, maxX, minY, maxY };
  };

  let { minX, maxX, minY, maxY } = bbox();
  const clusterW = maxX - minX;
  const clusterH = maxY - minY;
  const scale = Math.min(
    1,
    availableW / clusterW,
    availableH / clusterH
  );

  if (scale < 1) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    for (const n of simNodes) {
      n.x = cx + ((n.x ?? 0) - cx) * scale;
      n.y = cy + ((n.y ?? 0) - cy) * scale;
    }
    ({ minX, maxX, minY, maxY } = bbox());
  }

  const fitMinX = MARGIN_X;
  const fitMaxX = GRAPH_W - MARGIN_X;
  const fitMinY = MARGIN_TOP;
  const fitMaxY = GRAPH_H - MARGIN_BOTTOM;

  let dx = FOCAL_TARGET_X - (focalNode.x ?? cx0);
  let dy = FOCAL_TARGET_Y - (focalNode.y ?? cy0);

  if (minX + dx < fitMinX) dx += fitMinX - (minX + dx);
  else if (maxX + dx > fitMaxX) dx += fitMaxX - (maxX + dx);
  if (minY + dy < fitMinY) dy += fitMinY - (minY + dy);
  else if (maxY + dy > fitMaxY) dy += fitMaxY - (maxY + dy);

  for (const n of simNodes) {
    n.x = (n.x ?? 0) + dx;
    n.y = (n.y ?? 0) + dy;
  }

  const posMap = new Map(simNodes.map((n) => [n.id, n]));
  const neighborSim = simNodes.slice(1);

  const gridVerticals: number[] = [];
  for (let x = 0; x <= CANVAS_W; x += GRID) gridVerticals.push(x);
  const gridHorizontals: number[] = [];
  for (let y = 0; y <= CANVAS_H; y += GRID) gridHorizontals.push(y);

  const titleSize = title.length > 36 ? 52 : title.length > 22 ? 64 : 80;

  return new ImageResponse(
    (
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          display: "flex",
          position: "relative",
          background: BG,
          fontFamily: "sans-serif",
          color: TITLE_COLOR,
        }}
      >
        <svg
          style={{ position: "absolute", top: 0, left: 0 }}
          width={CANVAS_W}
          height={CANVAS_H}
        >
          {gridVerticals.map((x) => (
            <line
              key={`gv-${x}`}
              x1={x}
              y1={0}
              x2={x}
              y2={CANVAS_H}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
          ))}
          {gridHorizontals.map((y) => (
            <line
              key={`gh-${y}`}
              x1={0}
              y1={y}
              x2={CANVAS_W}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
          ))}
        </svg>

        <svg
          style={{ position: "absolute", top: GRAPH_Y, left: GRAPH_X }}
          width={GRAPH_W}
          height={GRAPH_H}
        >
          {subgraphLinks.map((link, i) => {
            const srcId =
              typeof link.source === "string"
                ? link.source
                : (link.source as unknown as { id: string }).id;
            const tgtId =
              typeof link.target === "string"
                ? link.target
                : (link.target as unknown as { id: string }).id;
            const s = posMap.get(srcId);
            const t = posMap.get(tgtId);
            if (!s || !t) return null;
            return (
              <line
                key={`e-${i}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={LINE_COLOR}
                strokeWidth={1}
              />
            );
          })}

          {neighborSim.map((n, i) => {
            const r = radiusFor(n.val, false, dMult);
            return (
              <g key={`n-${i}`}>
                {n.phantom && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r + 1.5}
                    fill="none"
                    stroke={PHANTOM_RING_COLOR}
                    strokeDasharray="2 2"
                    strokeWidth={0.8}
                  />
                )}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={n.color}
                  fillOpacity={n.phantom ? 0.55 : 1}
                />
              </g>
            );
          })}

          {(() => {
            const r = radiusFor(focalNode.val, true, dMult);
            return (
              <g>
                <circle
                  cx={focalNode.x}
                  cy={focalNode.y}
                  r={r + 3.5}
                  fill="none"
                  stroke={RING_COLOR}
                  strokeWidth={1.3}
                />
                {focalIsPhantom && (
                  <circle
                    cx={focalNode.x}
                    cy={focalNode.y}
                    r={r + 1.8}
                    fill="none"
                    stroke={PHANTOM_RING_COLOR}
                    strokeDasharray="2 2"
                    strokeWidth={0.9}
                  />
                )}
                <circle
                  cx={focalNode.x}
                  cy={focalNode.y}
                  r={r}
                  fill={focalColor}
                  fillOpacity={focalIsPhantom ? 0.6 : 1}
                />
              </g>
            );
          })()}
        </svg>

        {neighborSim.map((n, i) => {
          const r = radiusFor(n.val, false, dMult);
          const absX = GRAPH_X + (n.x ?? 0);
          const absY = GRAPH_Y + (n.y ?? 0) + r + 4;
          const leftSpace = absX;
          const rightSpace = CANVAS_W - absX;
          const charW = labelFontSize * 0.55;
          const maxChars = clamp(
            Math.floor((2 * Math.min(leftSpace, rightSpace)) / charW) - 2,
            5,
            24
          );
          const BOX_W = 220;
          return (
            <div
              key={`l-${i}`}
              style={{
                position: "absolute",
                display: "flex",
                justifyContent: "center",
                top: absY,
                left: absX - BOX_W / 2,
                width: BOX_W,
                fontSize: labelFontSize,
                color: LABEL_COLOR,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
              }}
            >
              {truncateLabel(n.title, maxChars)}
            </div>
          );
        })}

        {(() => {
          const BOX_W = 280;
          const absX = GRAPH_X + (focalNode.x ?? 0);
          const absY =
            GRAPH_Y +
            (focalNode.y ?? 0) +
            radiusFor(focalNode.val, true, dMult) +
            6;
          return (
            <div
              style={{
                position: "absolute",
                display: "flex",
                justifyContent: "center",
                top: absY,
                left: absX - BOX_W / 2,
                width: BOX_W,
                fontSize: focalLabelFontSize,
                fontWeight: 600,
                color: FOCAL_LABEL_COLOR,
                whiteSpace: "nowrap",
              }}
            >
              {truncateLabel(title, 28)}
            </div>
          );
        })()}

        <div
          style={{
            position: "absolute",
            display: "flex",
            alignItems: "center",
            gap: 14,
            top: PAD_TOP,
            left: PAD_X,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: categoryColor,
            }}
          />
          <div
            style={{
              fontSize: 20,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: CATEGORY_TEXT_COLOR,
              fontWeight: 500,
            }}
          >
            {categoryLabel}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            display: "flex",
            left: PAD_X,
            right: PAD_X,
            bottom: PAD_BOTTOM,
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: TITLE_COLOR,
          }}
        >
          {title}
        </div>
      </div>
    ),
    size
  );
}

type d3Node = Parameters<typeof forceSimulation>[0] extends
  | Array<infer T>
  | undefined
  ? T
  : never;
type d3Link = Parameters<typeof forceLink>[0] extends
  | Array<infer T>
  | undefined
  ? T
  : never;
