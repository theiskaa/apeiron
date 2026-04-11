"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GraphData, GraphNode } from "@/lib/types";
import { READING_PATHS, type ReadingPath } from "@/lib/paths";
import {
  layoutPathWithCategory,
  type PathLayout,
} from "@/lib/paths-layout";

interface Props {
  graphData: GraphData;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  focusNodeId: string | null;
}

const PATH_COLORS: Record<string, string> = {
  "genesis": "#c4855c",
  "the-architecture": "#b5616a",
  "the-hidden-hand": "#9683b7",
  "the-dynasties": "#a87f98",
  "shattered-history": "#b89458",
  "forbidden-science": "#6790b5",
  "lost-worlds": "#c9a46f",
  "the-cosmic-question": "#549e93",
};

const APEIRON_ID = "__apeiron";
const APEIRON_WIDTH = 300;
const APEIRON_HEIGHT = 150;
const HORIZONTAL_GAP = 16;
const APEIRON_GAP = 260;
const APEIRON_TOP_PADDING = 280;
const CANVAS_BOTTOM_PADDING = 100;

const OFFSETS_STORAGE_KEY = "apeiron-path-offsets";
const GLOBAL_OFFSET_STORAGE_KEY = "apeiron-global-offset";

type PointXY = { x: number; y: number };

interface BasePlacement {
  path: ReadingPath;
  layout: PathLayout;
  color: string;
  baseOffsetX: number;
  baseOffsetY: number;
  orderMap: Map<string, number>;
}

interface ApeironPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BASE: {
  placements: BasePlacement[];
  apeiron: ApeironPos;
  width: number;
  height: number;
} = (() => {
  const allLayouts = READING_PATHS.map((path) => {
    const orderMap = new Map<string, number>();
    path.nodes.forEach((pn, i) => orderMap.set(pn.id, i + 1));
    return {
      path,
      layout: layoutPathWithCategory(path),
      color: PATH_COLORS[path.id] ?? "#8a8a99",
      orderMap,
    };
  });

  const maxHeight = Math.max(...allLayouts.map((l) => l.layout.height));
  const rowWidth =
    allLayouts.reduce((sum, l) => sum + l.layout.width, 0) +
    (allLayouts.length - 1) * HORIZONTAL_GAP;

  const canvasWidth = Math.max(rowWidth, APEIRON_WIDTH + 400);
  const rowStartX = (canvasWidth - rowWidth) / 2;
  const apeironY = APEIRON_TOP_PADDING;
  const rowY = apeironY + APEIRON_HEIGHT + APEIRON_GAP;
  const canvasHeight = rowY + maxHeight + CANVAS_BOTTOM_PADDING;
  const apeironX = canvasWidth / 2 - APEIRON_WIDTH / 2;

  let cursorX = rowStartX;
  const placements: BasePlacement[] = allLayouts.map((l) => {
    const offsetX = cursorX;
    cursorX += l.layout.width + HORIZONTAL_GAP;
    return {
      path: l.path,
      layout: l.layout,
      color: l.color,
      baseOffsetX: offsetX,
      baseOffsetY: rowY,
      orderMap: l.orderMap,
    };
  });

  return {
    placements,
    apeiron: {
      x: apeironX,
      y: apeironY,
      width: APEIRON_WIDTH,
      height: APEIRON_HEIGHT,
    },
    width: canvasWidth,
    height: canvasHeight,
  };
})();

interface MegaNode {
  key: string;
  pathId: string;
  nodeId: string;
  kind: "apeiron" | "category" | "node";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  title?: string;
  description?: string;
  orderIndex?: number;
  // CSS transform string (applied around the element's center via
  // transform-origin). Combines velocity squish + settle bounce.
  transform?: string;
}

interface MegaEdge {
  key: string;
  pathId: string;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  emphasis: "normal" | "hub";
  // 1 = fully slack (vertical-tangent Bezier, the resting curve).
  // < 1 = tauter (blends toward a straight line from x1,y1 to x2,y2).
  // > 1 = more slack (bigger bulge, for compressed links).
  curveScale: number;
}

interface MegaPathGroup {
  pathId: string;
  nodes: MegaNode[];
  edges: MegaEdge[];
  // SVG rotation: angle (degrees) around (cx, cy).
  // Pivot is the category's top-center so the Apeiron hub edge endpoint
  // stays fixed as the path tilts.
  angleDeg: number;
  cx: number;
  cy: number;
}

interface MegaLayout {
  apeiron: MegaNode;
  hubEdges: MegaEdge[];
  pathGroups: MegaPathGroup[];
  width: number;
  height: number;
}

// Per-frame stiffness of the weak "return to base" position spring.
// Low enough that the link-spring wave dominates during motion.
const POS_K = 0.018;
// Per-frame stiffness of the shape-preserving spring on each layout edge.
// Main source of the jiggle — cursor yanks propagate through the link graph.
const LINK_K = 0.065;
// Velocity retained per frame (<1). Lower = overdamped, higher = more oscillation.
const DAMPING = 0.86;
// Sleep threshold in content pixels — sim halts per-path when below.
const EPS = 0.08;

// Radians per content-pixel of horizontal displacement-from-target.
// Average lag of ~60 px should produce ~3° of tilt.
const DISP_TO_ANGLE = 0.0009;
// Hard cap (radians, ~5.7°). Keeps the path from looking flipped even on a hard fling.
const MAX_TILT = 0.1;
// Spring constants on the angle itself — separate from node physics.
const ANGLE_K = 0.16;
const ANGLE_DAMP = 0.82;

// Per-frame push strength per pixel of (margin-inflated) overlap.
const COLLISION_K = 0.11;
// Padding added around each node's AABB so repulsion kicks in before visual contact.
const COLLISION_MARGIN = 14;

// Per-frame gravitational acceleration (acceleration, not force — mass-independent).
// Kept small so resting sag is imperceptible (~1–2 px under the position spring).
const GRAVITY = 0.02;
// Mass formula from path depth: mass = 1 + depth * DEPTH_MASS_COEFF.
// Root nodes are light, leaves are heavier → ripple slows as it propagates.
const DEPTH_MASS_COEFF = 0.35;

// Per-frame speeds below this get no squish (avoids subpixel noise on
// tiny residuals near rest).
const SQUISH_THRESHOLD = 1;
// Stretch factor per unit of speed past the threshold. Speed 10 → ~11% axis
// stretch along the velocity direction; perpendicular axis compressed to
// preserve area.
const SQUISH_K = 0.012;
// Hard cap on the stretch (0.15 ≈ 15% max axis distortion).
const SQUISH_MAX = 0.15;

// One-shot pop when a path transitions from hot → rest. Keeps the sim "hot"
// for this many ms so the rAF loop drives the animation; playback is a
// half-sine in the rendered scale.
const BUMP_DURATION_MS = 280;
// Peak scale amplitude at the apex of the half-sine (0.028 = 2.8% pop).
const BUMP_AMP = 0.028;

interface SimNode {
  key: string;
  pathId: string;
  nodeId: string;
  kind: "category" | "node";
  bx: number;
  by: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  title?: string;
  // Short description, set only on category nodes — the inline path blurb
  // that replaced the old ExplorerPanel.
  description?: string;
  orderIndex?: number;
  // Physical mass, derived from path depth at init time.
  // invMass = 1/mass is precomputed to avoid per-frame division.
  mass: number;
  invMass: number;
}

interface SimLink {
  from: string;
  to: string;
  restDx: number;
  restDy: number;
}

interface PathSim {
  pathId: string;
  color: string;
  nodes: Map<string, SimNode>;
  links: SimLink[];
  categoryKey: string | null;
  // Which node is currently pinned to the cursor (null when not dragging).
  // Replaces categoryKey as the "held" handle so any node can be grabbed.
  pinnedKey: string | null;
  committedOffset: PointXY;
  liveOffset: PointXY;
  dragging: boolean;
  hot: boolean;
  // Visual tilt (radians) of the whole path. Rotated around the category's
  // top-center — which is also where the Apeiron hub edge lands, so that
  // connection stays visually stable during rotation.
  angle: number;
  angleVel: number;
  // Moment of inertia around the pivot, Σ mᵢ·rᵢ² in rest-geometry.
  // Bigger (more/heavier/further nodes) → harder to rotate.
  inertia: number;
  // Multiplier on the angle spring torque so heavier paths rotate slower.
  // Computed as I_ref / inertia where I_ref is the average across all paths,
  // so the "typical" path keeps roughly the old feel.
  inertiaScale: number;
  // Timestamp (performance.now()) at which this path landed from motion.
  // While non-null and within BUMP_DURATION_MS, the sim is kept hot so the
  // landing-bump scale animates; cleared afterward or if physics re-stirs.
  bumpStart: number | null;
}

function initSims(): Map<string, PathSim> {
  const sims = new Map<string, PathSim>();
  for (const p of BASE.placements) {
    const nodes = new Map<string, SimNode>();
    const byLocalId = new Map<string, SimNode>();
    let categoryKey: string | null = null;

    for (const n of p.layout.nodes) {
      const key = `${p.path.id}::${n.id}`;
      const bx = n.x + p.baseOffsetX;
      const by = n.y + p.baseOffsetY;
      const kind: "category" | "node" =
        n.kind === "category" ? "category" : "node";
      // Layout depth: 0 = category, 1 = roots, deeper = further along the path.
      const depth = n.depth ?? 0;
      const mass = 1 + depth * DEPTH_MASS_COEFF;
      const sn: SimNode = {
        key,
        pathId: p.path.id,
        nodeId: n.id,
        kind,
        bx,
        by,
        x: bx,
        y: by,
        vx: 0,
        vy: 0,
        width:
          kind === "category" ? p.layout.categoryNodeWidth : p.layout.nodeWidth,
        height:
          kind === "category"
            ? p.layout.categoryNodeHeight
            : p.layout.nodeHeight,
        color: p.color,
        title: kind === "category" ? p.path.title : undefined,
        description: kind === "category" ? p.path.description : undefined,
        orderIndex: kind === "category" ? undefined : p.orderMap.get(n.id),
        mass,
        invMass: 1 / mass,
      };
      nodes.set(key, sn);
      byLocalId.set(n.id, sn);
      if (kind === "category") categoryKey = key;
    }

    const links: SimLink[] = [];
    for (const e of p.layout.edges) {
      const a = byLocalId.get(e.from);
      const b = byLocalId.get(e.to);
      if (!a || !b) continue;
      links.push({
        from: a.key,
        to: b.key,
        restDx: b.bx - a.bx,
        restDy: b.by - a.by,
      });
    }

    // Moment of inertia around the category pivot, using resting node
    // centers. Computed once at init because the rest geometry is fixed.
    let inertia = 0;
    if (categoryKey) {
      const cat = nodes.get(categoryKey);
      if (cat) {
        const pivotX = cat.bx + cat.width / 2;
        const pivotY = cat.by;
        for (const n of nodes.values()) {
          if (n.key === categoryKey) continue;
          const rx = n.bx + n.width / 2 - pivotX;
          const ry = n.by + n.height / 2 - pivotY;
          inertia += n.mass * (rx * rx + ry * ry);
        }
      }
    }

    sims.set(p.path.id, {
      pathId: p.path.id,
      color: p.color,
      nodes,
      links,
      categoryKey,
      pinnedKey: null,
      committedOffset: { x: 0, y: 0 },
      liveOffset: { x: 0, y: 0 },
      dragging: false,
      hot: false,
      angle: 0,
      angleVel: 0,
      inertia: inertia || 1,
      inertiaScale: 1, // filled in by the second pass below
      bumpStart: null,
    });
  }

  // Second pass: normalize so the average path has inertiaScale ≈ 1.
  // Heavier paths get a smaller scale (rotate slower under the same torque),
  // lighter paths a larger scale. The typical feel of the old displacement-
  // driven formula is preserved for the mean path.
  let totalI = 0;
  let count = 0;
  for (const sim of sims.values()) {
    totalI += sim.inertia;
    count++;
  }
  const I_REF = count > 0 ? totalI / count : 1;
  for (const sim of sims.values()) {
    sim.inertiaScale = I_REF / sim.inertia;
  }

  return sims;
}

// Pairwise inter-path soft collision. Runs once per tick across all sims,
// BEFORE stepSim. Pinned nodes (locked to the cursor) act as immovable walls:
// they still get tested for overlap, but only the non-pinned counterpart
// receives the resulting push. Collision wakes any affected sim so it gets
// integrated this tick.
function applyInterCollisions(sims: Map<string, PathSim>): void {
  type Item = { n: SimNode; pid: string; pinned: boolean; sim: PathSim };
  const items: Item[] = [];
  for (const [pid, sim] of sims) {
    const pinKey = sim.dragging ? sim.pinnedKey : null;
    for (const n of sim.nodes.values()) {
      items.push({ n, pid, pinned: n.key === pinKey, sim });
    }
  }

  for (let i = 0; i < items.length; i++) {
    const ai = items[i];
    for (let j = i + 1; j < items.length; j++) {
      const bj = items[j];
      if (ai.pid === bj.pid) continue;
      if (ai.pinned && bj.pinned) continue;

      const a = ai.n;
      const b = bj.n;
      const overlapX =
        Math.min(a.x + a.width, b.x + b.width) -
        Math.max(a.x, b.x) +
        COLLISION_MARGIN * 2;
      if (overlapX <= 0) continue;
      const overlapY =
        Math.min(a.y + a.height, b.y + b.height) -
        Math.max(a.y, b.y) +
        COLLISION_MARGIN * 2;
      if (overlapY <= 0) continue;

      const acx = a.x + a.width / 2;
      const acy = a.y + a.height / 2;
      const bcx = b.x + b.width / 2;
      const bcy = b.y + b.height / 2;

      // Push along the axis with the smaller overlap. Equal-and-opposite
      // impulse of magnitude f is applied to both sides; dividing by each
      // side's invMass makes the resulting velocity change reflect mass
      // (lighter nodes accelerate more from the same impulse).
      if (overlapX < overlapY) {
        const f = overlapX * COLLISION_K * 0.5;
        const dir = bcx > acx ? 1 : -1;
        if (!ai.pinned) {
          a.vx -= dir * f * a.invMass;
          ai.sim.hot = true;
        }
        if (!bj.pinned) {
          b.vx += dir * f * b.invMass;
          bj.sim.hot = true;
        }
      } else {
        const f = overlapY * COLLISION_K * 0.5;
        const dir = bcy > acy ? 1 : -1;
        if (!ai.pinned) {
          a.vy -= dir * f * a.invMass;
          ai.sim.hot = true;
        }
        if (!bj.pinned) {
          b.vy += dir * f * b.invMass;
          bj.sim.hot = true;
        }
      }
    }
  }
}

function stepSim(sim: PathSim, globalOffset: PointXY): boolean {
  // Effective target offset is the path's own offset plus the global offset
  // from an Apeiron drag. Both additively shift where each node wants to be.
  const offX =
    (sim.dragging ? sim.liveOffset.x : sim.committedOffset.x) + globalOffset.x;
  const offY =
    (sim.dragging ? sim.liveOffset.y : sim.committedOffset.y) + globalOffset.y;
  const pinKey = sim.dragging ? sim.pinnedKey : null;

  // Position spring: F = k·(target−pos), a = F/m → v += F·invMass.
  for (const n of sim.nodes.values()) {
    if (n.key === pinKey) continue;
    n.vx += (n.bx + offX - n.x) * POS_K * n.invMass;
    n.vy += (n.by + offY - n.y) * POS_K * n.invMass;
  }

  // Link spring: equal-and-opposite force on each endpoint. Dividing each
  // side by its own invMass conserves momentum across a link regardless
  // of the mass ratio.
  for (const link of sim.links) {
    const a = sim.nodes.get(link.from);
    const b = sim.nodes.get(link.to);
    if (!a || !b) continue;
    const errX = b.x - a.x - link.restDx;
    const errY = b.y - a.y - link.restDy;
    const fx = errX * LINK_K;
    const fy = errY * LINK_K;
    if (a.key !== pinKey) {
      a.vx += fx * a.invMass;
      a.vy += fy * a.invMass;
    }
    if (b.key !== pinKey) {
      b.vx -= fx * b.invMass;
      b.vy -= fy * b.invMass;
    }
  }

  // Gravity: acceleration, not force — applied to all non-pinned nodes
  // regardless of mass (every object falls the same).
  for (const n of sim.nodes.values()) {
    if (n.key === pinKey) continue;
    n.vy += GRAVITY;
  }

  let physicsHot = sim.dragging;
  for (const n of sim.nodes.values()) {
    if (n.key === pinKey) {
      n.x = n.bx + offX;
      n.y = n.by + offY;
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
    // Gravity shifts the spring equilibrium below base by sagY, so the rest
    // check must compare against (base + sag) or the sim would never go cold.
    const sagY = GRAVITY / (POS_K * n.invMass);
    if (
      Math.abs(n.vx) > EPS ||
      Math.abs(n.vy) > EPS ||
      Math.abs(n.x - n.bx - offX) > EPS ||
      Math.abs(n.y - n.by - offY - sagY) > EPS
    ) {
      physicsHot = true;
    }
  }

  // Angle update: second-order spring (momentum + damping) on the path's
  // tilt. Now scaled by inertiaScale so heavier paths (more/deeper nodes)
  // resist rotation proportionally — the torque→α divide by I made physical.
  let sumDispX = 0;
  let count = 0;
  for (const n of sim.nodes.values()) {
    if (n.key === pinKey) continue;
    sumDispX += n.x - (n.bx + offX);
    count++;
  }
  const avgDispX = count > 0 ? sumDispX / count : 0;
  const targetAngle = Math.max(
    -MAX_TILT,
    Math.min(MAX_TILT, avgDispX * DISP_TO_ANGLE)
  );
  sim.angleVel += (targetAngle - sim.angle) * ANGLE_K * sim.inertiaScale;
  sim.angleVel *= ANGLE_DAMP;
  sim.angle += sim.angleVel;
  if (Math.abs(sim.angle) > 0.0015 || Math.abs(sim.angleVel) > 0.0015) {
    physicsHot = true;
  }

  if (!physicsHot) {
    // Cold snap to the true equilibrium (target + gravity sag). This is what
    // the hot-check above compares against, so a settled sim stays settled
    // on the next tick.
    for (const n of sim.nodes.values()) {
      n.x = n.bx + offX;
      n.y = n.by + offY + GRAVITY / (POS_K * n.invMass);
      n.vx = 0;
      n.vy = 0;
    }
    sim.angle = 0;
    sim.angleVel = 0;
  }

  // Landing bump: when the sim transitions from physics-hot to rest, start a
  // one-shot pop that keeps the loop alive for BUMP_DURATION_MS so the scale
  // animation plays. Physical re-stirring (any physicsHot frame) cancels it.
  const now = performance.now();
  if (physicsHot) {
    sim.bumpStart = null;
  } else if (sim.hot && sim.bumpStart === null) {
    sim.bumpStart = now;
  }

  let hot = physicsHot;
  if (sim.bumpStart !== null) {
    if (now - sim.bumpStart < BUMP_DURATION_MS) {
      hot = true;
    } else {
      sim.bumpStart = null;
    }
  }

  sim.hot = hot;
  return hot;
}

function buildMegaLayout(
  sims: Map<string, PathSim>,
  globalOffset: PointXY
): MegaLayout {
  // Apeiron is the only thing that renders at globalOffset directly — every
  // other node's sim position already reflects the global shift via stepSim's
  // target calculation.
  const apeironX = BASE.apeiron.x + globalOffset.x;
  const apeironY = BASE.apeiron.y + globalOffset.y;
  const apeiron: MegaNode = {
    key: APEIRON_ID,
    pathId: APEIRON_ID,
    nodeId: APEIRON_ID,
    kind: "apeiron",
    x: apeironX,
    y: apeironY,
    width: BASE.apeiron.width,
    height: BASE.apeiron.height,
    color: "#d8d8e0",
    title: "Apeirron",
  };

  const hubEdges: MegaEdge[] = [];
  const pathGroups: MegaPathGroup[] = [];

  let maxX = apeironX + BASE.apeiron.width;
  let maxY = apeironY + BASE.apeiron.height;

  const now = performance.now();

  for (const sim of sims.values()) {
    const groupNodes: MegaNode[] = [];
    const groupEdges: MegaEdge[] = [];

    // Uniform bump scale driven by sim.bumpStart. Half-sine from 0 → peak → 0
    // across BUMP_DURATION_MS, peaking at 1 + BUMP_AMP.
    let bumpScale = 1;
    if (sim.bumpStart !== null) {
      const t = (now - sim.bumpStart) / BUMP_DURATION_MS;
      if (t >= 0 && t <= 1) {
        bumpScale = 1 + BUMP_AMP * Math.sin(t * Math.PI);
      }
    }

    for (const n of sim.nodes.values()) {
      // Velocity squish: stretch along velocity, compress perpendicular,
      // area-preserving so the node's apparent size stays constant.
      const speed = Math.hypot(n.vx, n.vy);
      let transform: string | undefined;
      if (speed > SQUISH_THRESHOLD) {
        const s = Math.min(
          1 + SQUISH_MAX,
          1 + (speed - SQUISH_THRESHOLD) * SQUISH_K
        );
        const angleDeg = (Math.atan2(n.vy, n.vx) * 180) / Math.PI;
        const sx = s * bumpScale;
        const sy = (bumpScale / s);
        transform = `rotate(${angleDeg}deg) scale(${sx}, ${sy}) rotate(${-angleDeg}deg)`;
      } else if (bumpScale !== 1) {
        transform = `scale(${bumpScale})`;
      }

      groupNodes.push({
        key: n.key,
        pathId: n.pathId,
        nodeId: n.nodeId,
        kind: n.kind,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        color: n.color,
        title: n.title,
        description: n.description,
        orderIndex: n.orderIndex,
        transform,
      });
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }

    for (const link of sim.links) {
      const a = sim.nodes.get(link.from);
      const b = sim.nodes.get(link.to);
      if (!a || !b) continue;

      const x1 = a.x + a.width / 2;
      const y1 = a.y + a.height;
      const x2 = b.x + b.width / 2;
      const y2 = b.y;

      // Strain = how much the edge has stretched relative to its resting length.
      // Rest endpoints use the base node positions (bx/by) in the same
      // coordinate system as the live ones, so the ratio is purely physical.
      const rx1 = a.bx + a.width / 2;
      const ry1 = a.by + a.height;
      const rx2 = b.bx + b.width / 2;
      const ry2 = b.by;
      const restLen = Math.hypot(rx2 - rx1, ry2 - ry1) || 1;
      const curLen = Math.hypot(x2 - x1, y2 - y1) || 1;
      const strain = (curLen - restLen) / restLen;
      const curveScale = Math.max(
        0.3,
        Math.min(1.8, Math.exp(-strain * 1.2))
      );

      groupEdges.push({
        key: `${link.from}->${link.to}`,
        pathId: sim.pathId,
        color: sim.color,
        x1,
        y1,
        x2,
        y2,
        emphasis: "normal",
        curveScale,
      });
    }

    // Rotation pivot: category's top-center. Any non-rotating content anchored
    // at this point (the Apeiron hub edge) stays visually stable while the
    // path tilts around it.
    let cx = 0;
    let cy = 0;
    if (sim.categoryKey) {
      const cat = sim.nodes.get(sim.categoryKey);
      if (cat) {
        cx = cat.x + cat.width / 2;
        cy = cat.y;
        // Hub edge tautness: as the category is pulled from home, the edge
        // straightens out. 600 px of pull drops the curve scale to the floor.
        const homeX = cat.bx + cat.width / 2;
        const homeY = cat.by;
        const displace = Math.hypot(cx - homeX, cy - homeY);
        const hubCurve = Math.max(0.2, 1 - displace / 600);
        hubEdges.push({
          key: `hub->${sim.pathId}`,
          pathId: sim.pathId,
          color: sim.color,
          x1: apeironX + BASE.apeiron.width / 2,
          y1: apeironY + BASE.apeiron.height,
          x2: cx,
          y2: cy,
          emphasis: "hub",
          curveScale: hubCurve,
        });
      }
    }

    pathGroups.push({
      pathId: sim.pathId,
      nodes: groupNodes,
      edges: groupEdges,
      angleDeg: (sim.angle * 180) / Math.PI,
      cx,
      cy,
    });
  }

  return {
    apeiron,
    hubEdges,
    pathGroups,
    width: Math.max(maxX, BASE.width),
    height: Math.max(maxY, BASE.height),
  };
}

export default function PathsGraph({
  graphData,
  onNodeClick,
  selectedNodeId,
}: Props) {
  const byId = useMemo(
    () => new Map(graphData.nodes.map((n) => [n.id, n])),
    [graphData.nodes]
  );

  const simsRef = useRef<Map<string, PathSim> | null>(null);
  if (simsRef.current === null) {
    simsRef.current = initSims();
  }

  const [tick, setTick] = useState(0);
  const [draggingPathId, setDraggingPathId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);

  // Set true once a pointerdown has crossed the drag threshold. Read by the
  // click wrapper so that releasing after a drag doesn't also fire onClick.
  const dragOccurredRef = useRef(false);

  // Global offset — set by dragging Apeiron, shifts every path's target
  // position uniformly. Apeiron renders at base + global; paths render at
  // their sim position (which physics pulls toward base + path + global).
  const globalOffsetRef = useRef<PointXY>({ x: 0, y: 0 });
  const globalLiveOffsetRef = useRef<PointXY>({ x: 0, y: 0 });
  const draggingGlobalRef = useRef(false);

  const getEffectiveGlobalOffset = useCallback((): PointXY => {
    return draggingGlobalRef.current
      ? globalLiveOffsetRef.current
      : globalOffsetRef.current;
  }, []);

  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const ensureRunning = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    const loop = () => {
      const sims = simsRef.current;
      let anyHot = false;
      if (sims) {
        const globalOffset = getEffectiveGlobalOffset();
        // Collisions can wake cold sims — run first so stepSim then integrates them.
        applyInterCollisions(sims);
        for (const sim of sims.values()) {
          if (sim.hot && stepSim(sim, globalOffset)) anyHot = true;
        }
      }
      setTick((t) => t + 1);
      if (anyHot) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        runningRef.current = false;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [getEffectiveGlobalOffset]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    const sims = simsRef.current;
    if (!sims) return;
    try {
      const saved = localStorage.getItem(OFFSETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          for (const [pathId, val] of Object.entries(parsed)) {
            const sim = sims.get(pathId);
            if (!sim || !val || typeof val !== "object") continue;
            const v = val as { x?: number; y?: number };
            const off = { x: v.x ?? 0, y: v.y ?? 0 };
            sim.committedOffset = off;
            sim.liveOffset = { ...off };
            for (const n of sim.nodes.values()) {
              n.x = n.bx + off.x;
              n.y = n.by + off.y;
              n.vx = 0;
              n.vy = 0;
            }
          }
        }
      }
      const savedGlobal = localStorage.getItem(GLOBAL_OFFSET_STORAGE_KEY);
      if (savedGlobal) {
        const parsed = JSON.parse(savedGlobal);
        if (parsed && typeof parsed === "object") {
          const v = parsed as { x?: number; y?: number };
          const g = { x: v.x ?? 0, y: v.y ?? 0 };
          globalOffsetRef.current = g;
          globalLiveOffsetRef.current = { ...g };
          // Snap every sim's live positions to the shifted rest so the
          // reload doesn't trigger a physics "catch up" on mount.
          for (const sim of sims.values()) {
            for (const n of sim.nodes.values()) {
              n.x = n.bx + sim.committedOffset.x + g.x;
              n.y = n.by + sim.committedOffset.y + g.y;
              n.vx = 0;
              n.vy = 0;
            }
          }
        }
      }
      setTick((t) => t + 1);
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      runningRef.current = false;
    };
  }, []);

  const persistOffsets = useCallback(() => {
    const sims = simsRef.current;
    if (!sims) return;
    try {
      const offsets: Record<string, PointXY> = {};
      for (const [id, sim] of sims) {
        if (sim.committedOffset.x !== 0 || sim.committedOffset.y !== 0) {
          offsets[id] = { ...sim.committedOffset };
        }
      }
      localStorage.setItem(OFFSETS_STORAGE_KEY, JSON.stringify(offsets));
    } catch {}
  }, []);

  const persistGlobalOffset = useCallback(() => {
    try {
      const g = globalOffsetRef.current;
      if (g.x === 0 && g.y === 0) {
        localStorage.removeItem(GLOBAL_OFFSET_STORAGE_KEY);
      } else {
        localStorage.setItem(GLOBAL_OFFSET_STORAGE_KEY, JSON.stringify(g));
      }
    } catch {}
  }, []);

  const megaLayout = useMemo(
    () => buildMegaLayout(simsRef.current!, getEffectiveGlobalOffset()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );

  const hasDrags = useMemo(() => {
    const sims = simsRef.current;
    if (!sims) return false;
    const g = globalOffsetRef.current;
    if (g.x !== 0 || g.y !== 0) return true;
    for (const sim of sims.values()) {
      if (sim.committedOffset.x !== 0 || sim.committedOffset.y !== 0) return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      // Suppress click that was actually the end of a drag.
      if (dragOccurredRef.current) {
        dragOccurredRef.current = false;
        return;
      }
      onNodeClick(nodeId);
    },
    [onNodeClick]
  );

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, pathId: string, nodeKey: string) => {
      e.stopPropagation();
      const sims = simsRef.current;
      if (!sims) return;
      const sim = sims.get(pathId);
      if (!sim) return;
      if (!sim.nodes.has(nodeKey)) return;

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startOffset = { ...sim.committedOffset };

      // Hysteresis: only treat as a drag once the pointer has moved enough.
      // Below threshold we leave the sim untouched so click-through still works.
      const DRAG_THRESHOLD = 4;
      let dragActive = false;
      dragOccurredRef.current = false;

      // Smoothed cursor velocity in content-space px/ms, read on release
      // to produce fling momentum.
      let lastMoveTime = performance.now();
      let lastMoveClientX = startClientX;
      let lastMoveClientY = startClientY;
      const cursorVel = { x: 0, y: 0 };

      const activate = () => {
        dragActive = true;
        dragOccurredRef.current = true;
        sim.pinnedKey = nodeKey;
        sim.dragging = true;
        sim.liveOffset = { ...startOffset };
        sim.hot = true;
        setDraggingPathId(pathId);
        ensureRunning();
      };

      const handleMove = (ev: PointerEvent) => {
        const scale = transformRef.current.scale || 1;
        const dxClient = ev.clientX - startClientX;
        const dyClient = ev.clientY - startClientY;

        if (!dragActive) {
          if (Math.hypot(dxClient, dyClient) < DRAG_THRESHOLD) return;
          activate();
        }

        sim.liveOffset = {
          x: startOffset.x + dxClient / scale,
          y: startOffset.y + dyClient / scale,
        };
        sim.hot = true;

        // EMA-smoothed velocity, content px/ms
        const now = performance.now();
        const dt = Math.max(1, now - lastMoveTime);
        const vx = (ev.clientX - lastMoveClientX) / dt / scale;
        const vy = (ev.clientY - lastMoveClientY) / dt / scale;
        const alpha = 0.35;
        cursorVel.x = cursorVel.x * (1 - alpha) + vx * alpha;
        cursorVel.y = cursorVel.y * (1 - alpha) + vy * alpha;
        lastMoveTime = now;
        lastMoveClientX = ev.clientX;
        lastMoveClientY = ev.clientY;
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);

        if (!dragActive) return;

        // Stale velocity guard: if the cursor paused before release, don't fling.
        const now = performance.now();
        const stale = now - lastMoveTime > 60;
        const vxMs = stale ? 0 : cursorVel.x;
        const vyMs = stale ? 0 : cursorVel.y;

        // Extrapolate commit point forward along the velocity so the path
        // coasts past the release point into its new resting offset.
        const FLING_COAST_MS = 180;
        sim.committedOffset = {
          x: sim.liveOffset.x + vxMs * FLING_COAST_MS,
          y: sim.liveOffset.y + vyMs * FLING_COAST_MS,
        };

        // Inject velocity into every node (per-frame, assuming 60fps) so the
        // motion is continuous across release instead of a teleport+settle.
        const MS_PER_FRAME = 1000 / 60;
        const vxFrame = vxMs * MS_PER_FRAME;
        const vyFrame = vyMs * MS_PER_FRAME;
        for (const n of sim.nodes.values()) {
          n.vx += vxFrame;
          n.vy += vyFrame;
        }

        sim.dragging = false;
        sim.pinnedKey = null;
        sim.hot = true;
        setDraggingPathId(null);
        persistOffsets();
        ensureRunning();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [ensureRunning, persistOffsets]
  );

  const handleApeironPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      const sims = simsRef.current;
      if (!sims) return;

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startOffset = { ...globalOffsetRef.current };

      const DRAG_THRESHOLD = 4;
      let dragActive = false;
      dragOccurredRef.current = false;

      let lastMoveTime = performance.now();
      let lastMoveClientX = startClientX;
      let lastMoveClientY = startClientY;
      const cursorVel = { x: 0, y: 0 };

      const markAllHot = () => {
        for (const sim of sims.values()) sim.hot = true;
      };

      const activate = () => {
        dragActive = true;
        dragOccurredRef.current = true;
        draggingGlobalRef.current = true;
        globalLiveOffsetRef.current = { ...startOffset };
        markAllHot();
        ensureRunning();
      };

      const handleMove = (ev: PointerEvent) => {
        const scale = transformRef.current.scale || 1;
        const dxClient = ev.clientX - startClientX;
        const dyClient = ev.clientY - startClientY;

        if (!dragActive) {
          if (Math.hypot(dxClient, dyClient) < DRAG_THRESHOLD) return;
          activate();
        }

        globalLiveOffsetRef.current = {
          x: startOffset.x + dxClient / scale,
          y: startOffset.y + dyClient / scale,
        };
        markAllHot();

        const now = performance.now();
        const dt = Math.max(1, now - lastMoveTime);
        const vx = (ev.clientX - lastMoveClientX) / dt / scale;
        const vy = (ev.clientY - lastMoveClientY) / dt / scale;
        const alpha = 0.35;
        cursorVel.x = cursorVel.x * (1 - alpha) + vx * alpha;
        cursorVel.y = cursorVel.y * (1 - alpha) + vy * alpha;
        lastMoveTime = now;
        lastMoveClientX = ev.clientX;
        lastMoveClientY = ev.clientY;
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);

        if (!dragActive) return;

        const now = performance.now();
        const stale = now - lastMoveTime > 60;
        const vxMs = stale ? 0 : cursorVel.x;
        const vyMs = stale ? 0 : cursorVel.y;

        // Fling coast: commit the global offset forward along velocity so
        // the whole diagram glides past the release point, then settles.
        const FLING_COAST_MS = 180;
        globalOffsetRef.current = {
          x: globalLiveOffsetRef.current.x + vxMs * FLING_COAST_MS,
          y: globalLiveOffsetRef.current.y + vyMs * FLING_COAST_MS,
        };
        globalLiveOffsetRef.current = { ...globalOffsetRef.current };

        // Inject velocity into every node so the coast carries every path
        // (otherwise they'd start from rest against the new coasted target).
        const MS_PER_FRAME = 1000 / 60;
        const vxFrame = vxMs * MS_PER_FRAME;
        const vyFrame = vyMs * MS_PER_FRAME;
        for (const sim of sims.values()) {
          for (const n of sim.nodes.values()) {
            n.vx += vxFrame;
            n.vy += vyFrame;
          }
        }

        draggingGlobalRef.current = false;
        markAllHot();
        persistGlobalOffset();
        ensureRunning();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [ensureRunning, persistGlobalOffset]
  );

  const handleResetLayout = useCallback(() => {
    const sims = simsRef.current;
    if (!sims) return;
    for (const sim of sims.values()) {
      sim.committedOffset = { x: 0, y: 0 };
      sim.liveOffset = { x: 0, y: 0 };
      sim.hot = true;
    }
    globalOffsetRef.current = { x: 0, y: 0 };
    globalLiveOffsetRef.current = { x: 0, y: 0 };
    draggingGlobalRef.current = false;
    persistOffsets();
    persistGlobalOffset();
    ensureRunning();
  }, [ensureRunning, persistOffsets, persistGlobalOffset]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: "var(--graph-bg, #262626)" }}
    >
      <div className="absolute inset-0">
        <CanvasViewport
          transform={transform}
          setTransform={setTransform}
          contentWidth={megaLayout.width}
          contentHeight={megaLayout.height}
          onResetLayout={handleResetLayout}
          hasDrags={hasDrags}
        >
          <MegaDiagram
            layout={megaLayout}
            byId={byId}
            selectedNodeId={selectedNodeId}
            draggingPathId={draggingPathId}
            onNodeClick={handleNodeClick}
            onNodePointerDown={handleNodePointerDown}
            onApeironPointerDown={handleApeironPointerDown}
          />
        </CanvasViewport>
      </div>
    </div>
  );
}

interface MegaDiagramProps {
  layout: MegaLayout;
  byId: Map<string, GraphNode>;
  selectedNodeId: string | null;
  draggingPathId: string | null;
  onNodeClick: (id: string) => void;
  onNodePointerDown: (
    e: React.PointerEvent,
    pathId: string,
    nodeKey: string
  ) => void;
  onApeironPointerDown: (e: React.PointerEvent) => void;
}

function MegaDiagram({
  layout,
  byId,
  selectedNodeId,
  draggingPathId,
  onNodeClick,
  onNodePointerDown,
  onApeironPointerDown,
}: MegaDiagramProps) {
  const apeiron = layout.apeiron;
  return (
    <svg
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Apeiron paths map"
    >
      {/* Hub edges: Apeiron → each category pivot. Pivot is the rotation
          center, so these endpoints stay anchored no matter how a path tilts.
          Wrapped per-edge so unfocused hubs can dim with their path. */}
      {layout.hubEdges.map((edge) => (
        <g
          key={edge.key}
          style={{
            opacity:
              draggingPathId == null || edge.pathId === draggingPathId
                ? 1
                : 0.35,
            transition: "opacity 180ms ease",
          }}
        >
          <EdgePath edge={edge} />
        </g>
      ))}
      {/* Per-path groups, each rotated around its category top-center.
          While one path is being dragged, all others dim for focus. */}
      {layout.pathGroups.map((g) => {
        const focused =
          draggingPathId == null || g.pathId === draggingPathId;
        return (
          <g
            key={g.pathId}
            transform={`rotate(${g.angleDeg} ${g.cx} ${g.cy})`}
            style={{
              opacity: focused ? 1 : 0.35,
              transition: "opacity 180ms ease",
            }}
          >
            <g>
              {g.edges.map((edge) => (
                <EdgePath key={edge.key} edge={edge} />
              ))}
            </g>
            <g>
              {g.nodes.map((n) => (
                <foreignObject
                  key={n.key}
                  x={n.x}
                  y={n.y}
                  width={n.width}
                  height={n.height}
                  overflow="visible"
                >
                  <NodeBox
                    node={n}
                    real={n.kind === "node" ? byId.get(n.nodeId) : undefined}
                    isSelected={n.kind === "node" && selectedNodeId === n.nodeId}
                    isDragging={n.pathId === draggingPathId}
                    onClick={() => {
                      if (n.kind !== "node") return;
                      if (byId.has(n.nodeId)) onNodeClick(n.nodeId);
                    }}
                    onNodePointerDown={onNodePointerDown}
                  />
                </foreignObject>
              ))}
            </g>
          </g>
        );
      })}
      {/* Apeiron itself: never rotates, rendered on top. Grabbing it drags
          the whole diagram via a global offset. */}
      <foreignObject
        key={apeiron.key}
        x={apeiron.x}
        y={apeiron.y}
        width={apeiron.width}
        height={apeiron.height}
        overflow="visible"
      >
        <NodeBox
          node={apeiron}
          real={undefined}
          isSelected={false}
          isDragging={false}
          onClick={() => {}}
          onNodePointerDown={onNodePointerDown}
          onApeironPointerDown={onApeironPointerDown}
        />
      </foreignObject>
    </svg>
  );
}

function EdgePath({ edge }: { edge: MegaEdge }) {
  const dx = edge.x2 - edge.x1;
  const dy = edge.y2 - edge.y1;
  const isHub = edge.emphasis === "hub";
  const edgeColor = isHub
    ? `color-mix(in srgb, ${edge.color} 55%, transparent)`
    : `color-mix(in srgb, ${edge.color} 32%, transparent)`;
  const arrowColor = `color-mix(in srgb, ${edge.color} 68%, transparent)`;
  const strokeWidth = isHub ? 1.8 : 1.4;

  // "Slack" control points: purely vertical tangents at the endpoints, which
  // is how the resting edge wants to look (boxes connect top/bottom).
  const offMag = Math.max(30, Math.abs(dy) * 0.5) * Math.sign(dy || 1);
  const vcp1x = edge.x1;
  const vcp1y = edge.y1 + offMag;
  const vcp2x = edge.x2;
  const vcp2y = edge.y2 - offMag;

  // "Taut" control points: 1/3 and 2/3 along the straight line from start
  // to end → the cubic degenerates to a straight line when curveScale → 0.
  const scp1x = edge.x1 + dx / 3;
  const scp1y = edge.y1 + dy / 3;
  const scp2x = edge.x1 + (2 * dx) / 3;
  const scp2y = edge.y1 + (2 * dy) / 3;

  // Blend: curveScale = 1 → full slack, curveScale = 0 → straight line,
  // curveScale > 1 → extra bulge (amplifies the vertical tangent offset).
  const s = edge.curveScale;
  const cp1x = scp1x + (vcp1x - scp1x) * s;
  const cp1y = scp1y + (vcp1y - scp1y) * s;
  const cp2x = scp2x + (vcp2x - scp2x) * s;
  const cp2y = scp2y + (vcp2y - scp2y) * s;

  const d = `M ${edge.x1} ${edge.y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${edge.x2} ${edge.y2}`;

  // Arrowhead tangent at t=1 is the direction from the last control point
  // to the endpoint. Works for any curve shape including the straight-line
  // degenerate case and the full-slack vertical case.
  const tdx = edge.x2 - cp2x;
  const tdy = edge.y2 - cp2y;
  const tlen = Math.hypot(tdx, tdy) || 1;
  const ux = tdx / tlen;
  const uy = tdy / tlen;
  const backLen = 7;
  const wingLen = 5;
  const backX = edge.x2 - ux * backLen;
  const backY = edge.y2 - uy * backLen;
  // Perpendicular to the tangent for the arrow wings.
  const perpX = -uy;
  const perpY = ux;
  const arrow = `M ${backX + perpX * wingLen} ${backY + perpY * wingLen} L ${edge.x2} ${edge.y2} L ${backX - perpX * wingLen} ${backY - perpY * wingLen}`;

  return (
    <g>
      <path
        d={d}
        stroke={edgeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={arrow}
        stroke={arrowColor}
        strokeWidth={strokeWidth + 0.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

interface NodeBoxProps {
  node: MegaNode;
  real: GraphNode | undefined;
  isSelected: boolean;
  isDragging: boolean;
  onClick: () => void;
  onNodePointerDown: (
    e: React.PointerEvent,
    pathId: string,
    nodeKey: string
  ) => void;
  onApeironPointerDown?: (e: React.PointerEvent) => void;
}

function NodeBox({
  node,
  real,
  isSelected,
  isDragging,
  onClick,
  onNodePointerDown,
  onApeironPointerDown,
}: NodeBoxProps) {
  if (node.kind === "apeiron") {
    return (
      <div
        onPointerDown={onApeironPointerDown}
        className="relative w-full h-full flex flex-col items-center justify-center gap-2.5 px-6 py-5 rounded-[36px] select-none text-center cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: `color-mix(in srgb, ${node.color} 18%, transparent)`,
          boxShadow: `inset 0 0 0 1.5px ${node.color}, 0 4px 28px color-mix(in srgb, ${node.color} 22%, transparent), 0 0 0 6px color-mix(in srgb, ${node.color} 8%, transparent)`,
          transform: node.transform,
          transformOrigin: "center",
        }}
      >
        <span className="text-[17px] font-semibold tracking-[0.18em] uppercase text-text-primary leading-tight">
          {node.title}
        </span>
        <p className="text-[11px] text-text-secondary leading-snug line-clamp-3 max-w-[85%]">
          Biggest questions humanity asks
        </p>
      </div>
    );
  }

  if (node.kind === "category") {
    return (
      <button
        onPointerDown={(e) => onNodePointerDown(e, node.pathId, node.key)}
        className={`group relative w-full h-full flex flex-col items-center justify-center gap-2 px-5 py-4 rounded-[28px] select-none text-center transition-all ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          backgroundColor: `color-mix(in srgb, ${node.color} ${isDragging ? 30 : 18}%, transparent)`,
          boxShadow: isDragging
            ? `inset 0 0 0 2px ${node.color}, 0 10px 32px color-mix(in srgb, ${node.color} 32%, transparent), 0 0 0 4px color-mix(in srgb, ${node.color} 15%, transparent)`
            : `inset 0 0 0 1.5px ${node.color}, 0 3px 16px color-mix(in srgb, ${node.color} 20%, transparent)`,
          transform: node.transform,
          transformOrigin: "center",
          willChange: node.transform ? "transform" : undefined,
        }}
        aria-label={`Drag ${node.title} path`}
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-text-primary leading-tight line-clamp-1">
          {node.title}
        </span>
        {node.description && (
          <p className="text-[10.5px] text-text-secondary leading-snug line-clamp-4">
            {node.description}
          </p>
        )}
      </button>
    );
  }

  const isPhantom = !real;
  const title = real?.title ?? node.nodeId;
  const orderLabel =
    node.orderIndex !== undefined
      ? String(node.orderIndex).padStart(2, "0")
      : null;

  return (
    <button
      onClick={onClick}
      onPointerDown={
        isPhantom
          ? undefined
          : (e) => onNodePointerDown(e, node.pathId, node.key)
      }
      disabled={isPhantom}
      className={`group relative w-full h-full flex items-center gap-2 px-3.5 text-left rounded-2xl transition-all ${
        isPhantom
          ? "cursor-not-allowed opacity-45"
          : "cursor-grab active:cursor-grabbing hover:brightness-125"
      }`}
      style={{
        // Tint by the node's own category color (GraphNode.color reflects the
        // node's category, not the path it appears in). Falls back to the
        // path color for phantoms that have no real GraphNode yet.
        backgroundColor: `color-mix(in srgb, ${real?.color ?? node.color} ${isPhantom ? 7 : 13}%, transparent)`,
        boxShadow: isSelected
          ? `inset 0 0 0 1.5px ${real?.color ?? node.color}, 0 0 0 3px color-mix(in srgb, ${real?.color ?? node.color} 22%, transparent)`
          : "none",
        transform: node.transform,
        transformOrigin: "center",
        willChange: node.transform ? "transform" : undefined,
      }}
      aria-label={isPhantom ? `${title} (not yet written)` : `Open ${title}`}
    >
      {orderLabel && (
        <span className="text-[9px] text-text-muted/60 tabular-nums tracking-wider shrink-0 font-medium">
          {orderLabel}
        </span>
      )}
      <span
        className={`text-[12px] leading-tight line-clamp-3 flex-1 transition-colors ${
          isSelected
            ? "text-text-primary font-medium"
            : "text-text-secondary group-hover:text-text-primary"
        }`}
      >
        {title}
      </span>
    </button>
  );
}

interface CanvasViewportProps {
  transform: { x: number; y: number; scale: number };
  setTransform: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; scale: number }>
  >;
  contentWidth: number;
  contentHeight: number;
  onResetLayout: () => void;
  hasDrags: boolean;
  children: React.ReactNode;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 3;

function CanvasViewport({
  transform,
  setTransform,
  contentWidth,
  contentHeight,
  onResetLayout,
  hasDrags,
  children,
}: CanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
  const panState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pointerId: -1,
  });

  // Cursor velocity in screen px/ms, EMA-smoothed during active panning,
  // read on pointerup to seed the coast-down loop.
  const panVelRef = useRef({ x: 0, y: 0 });
  const panLastRef = useRef({ t: 0, x: 0, y: 0 });
  const panInertiaRafRef = useRef<number | null>(null);
  // Cleanup for the global pointerdown listener that kills an in-flight coast
  // the moment the user touches anything — including a node the drag handler
  // stops propagation on, which the viewport's own pointerdown wouldn't see.
  const panInertiaCancelRef = useRef<(() => void) | null>(null);

  const stopPanInertia = useCallback(() => {
    if (panInertiaRafRef.current !== null) {
      cancelAnimationFrame(panInertiaRafRef.current);
      panInertiaRafRef.current = null;
    }
    if (panInertiaCancelRef.current !== null) {
      panInertiaCancelRef.current();
      panInertiaCancelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (panInertiaRafRef.current !== null) {
        cancelAnimationFrame(panInertiaRafRef.current);
        panInertiaRafRef.current = null;
      }
      if (panInertiaCancelRef.current !== null) {
        panInertiaCancelRef.current();
        panInertiaCancelRef.current = null;
      }
    };
  }, []);

  const fitToView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scaleX = (rect.width - 100) / contentWidth;
    const scaleY = (rect.height - 140) / contentHeight;
    const fit = Math.max(MIN_SCALE, Math.min(1, Math.min(scaleX, scaleY)));
    setTransform({
      x: (rect.width - contentWidth * fit) / 2,
      y: (rect.height - contentHeight * fit) / 2,
      scale: fit,
    });
  }, [contentWidth, contentHeight, setTransform]);

  const focusApeiron = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scale = Math.min(
      0.35,
      Math.max(0.18, (rect.width * 0.14) / (APEIRON_WIDTH * 2.5))
    );
    setTransform({
      x: rect.width / 2 - (contentWidth / 2) * scale,
      y: rect.height / 2 - (contentHeight / 2) * scale,
      scale,
    });
  }, [contentWidth, contentHeight, setTransform]);

  useLayoutEffect(() => {
    if (initialized) return;
    focusApeiron();
    setInitialized(true);
  }, [focusApeiron, initialized]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setTransform((t) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, t.scale * factor)
        );
        const ratio = newScale / t.scale;
        return {
          x: cx - (cx - t.x) * ratio,
          y: cy - (cy - t.y) * ratio,
          scale: newScale,
        };
      });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setTransform]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button")) return;
      // Grabbing the viewport kills any ongoing coast so the user lands on
      // exactly where they click, not where the decaying velocity drifts to.
      stopPanInertia();
      panState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: transform.x,
        originY: transform.y,
        pointerId: e.pointerId,
      };
      panVelRef.current = { x: 0, y: 0 };
      panLastRef.current = {
        t: performance.now(),
        x: e.clientX,
        y: e.clientY,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [transform.x, transform.y, stopPanInertia]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panState.current.active) return;
      setTransform((t) => ({
        ...t,
        x: panState.current.originX + (e.clientX - panState.current.startX),
        y: panState.current.originY + (e.clientY - panState.current.startY),
      }));
      // EMA-smoothed cursor velocity in screen px/ms.
      const now = performance.now();
      const dt = Math.max(1, now - panLastRef.current.t);
      const vx = (e.clientX - panLastRef.current.x) / dt;
      const vy = (e.clientY - panLastRef.current.y) / dt;
      const alpha = 0.35;
      panVelRef.current = {
        x: panVelRef.current.x * (1 - alpha) + vx * alpha,
        y: panVelRef.current.y * (1 - alpha) + vy * alpha,
      };
      panLastRef.current = { t: now, x: e.clientX, y: e.clientY };
    },
    [setTransform]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!panState.current.active) return;
      panState.current.active = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(
          panState.current.pointerId
        );
      } catch {}

      // Stale-velocity guard: if the cursor paused before release, don't coast.
      const now = performance.now();
      if (now - panLastRef.current.t > 60) {
        panVelRef.current = { x: 0, y: 0 };
        return;
      }

      // Convert px/ms → px/frame (assume 60fps) and decelerate each frame.
      // Screen-space px; no need to account for scale since transform.x/y
      // are themselves in screen coordinates.
      let vx = panVelRef.current.x * (1000 / 60);
      let vy = panVelRef.current.y * (1000 / 60);
      const PAN_FRICTION = 0.93;
      const PAN_MIN_VEL = 0.12;

      if (Math.abs(vx) < PAN_MIN_VEL && Math.abs(vy) < PAN_MIN_VEL) return;

      // Kill the coast on any subsequent touch anywhere — including on a node
      // whose handler stopPropagation's past the viewport div.
      const cancelOnInput = () => stopPanInertia();
      window.addEventListener("pointerdown", cancelOnInput, {
        once: true,
        capture: true,
      });
      panInertiaCancelRef.current = () => {
        window.removeEventListener("pointerdown", cancelOnInput, true);
      };

      const step = () => {
        setTransform((t) => ({ ...t, x: t.x + vx, y: t.y + vy }));
        vx *= PAN_FRICTION;
        vy *= PAN_FRICTION;
        if (Math.abs(vx) < PAN_MIN_VEL && Math.abs(vy) < PAN_MIN_VEL) {
          panInertiaRafRef.current = null;
          if (panInertiaCancelRef.current !== null) {
            panInertiaCancelRef.current();
            panInertiaCancelRef.current = null;
          }
          return;
        }
        panInertiaRafRef.current = requestAnimationFrame(step);
      };
      panInertiaRafRef.current = requestAnimationFrame(step);
    },
    [setTransform, stopPanInertia]
  );

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      setTransform((t) => {
        const newScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, t.scale * factor)
        );
        const ratio = newScale / t.scale;
        return {
          x: cx - (cx - t.x) * ratio,
          y: cy - (cy - t.y) * ratio,
          scale: newScale,
        };
      });
    },
    [setTransform]
  );

  return (
    <div
      ref={viewportRef}
      className={`absolute inset-0 ${
        panState.current.active ? "cursor-grabbing" : "cursor-grab"
      }`}
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          width: contentWidth,
          height: contentHeight,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          visibility: initialized ? "visible" : "hidden",
          willChange: "transform",
        }}
      >
        {children}
      </div>

      <ViewControls
        scale={transform.scale}
        onZoomIn={() => zoomAtCenter(1.2)}
        onZoomOut={() => zoomAtCenter(1 / 1.2)}
        onFit={fitToView}
        onFocus={focusApeiron}
        onResetLayout={onResetLayout}
        hasDrags={hasDrags}
      />
    </div>
  );
}

interface ViewControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onFocus: () => void;
  onResetLayout: () => void;
  hasDrags: boolean;
}

function ViewControls({
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
  onFocus,
  onResetLayout,
  hasDrags,
}: ViewControlsProps) {
  const btnStyle = {
    backgroundColor:
      "color-mix(in srgb, var(--text-primary) 5%, transparent)",
    boxShadow:
      "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 10%, transparent)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  };
  return (
    <div className="hidden md:flex absolute bottom-6 right-6 items-center gap-1.5 pointer-events-auto">
      {hasDrags && (
        <button
          onClick={onResetLayout}
          className="h-8 px-3 rounded-full flex items-center justify-center gap-1.5 text-[10px] text-text-muted hover:text-text-secondary tracking-wide transition-colors"
          style={btnStyle}
          aria-label="Reset layout"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 4 3 10 9 10" />
          </svg>
          <span>Reset layout</span>
        </button>
      )}
      <button
        onClick={onFocus}
        className="h-8 px-3 rounded-full flex items-center justify-center gap-1.5 text-[10px] text-text-muted hover:text-text-secondary tracking-wide transition-colors"
        style={btnStyle}
        aria-label="Focus Apeiron"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
        <span>Focus</span>
      </button>
      <button
        onClick={onZoomOut}
        className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
        style={btnStyle}
        aria-label="Zoom out"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        onClick={onFit}
        className="h-8 px-3 rounded-full flex items-center justify-center text-[10px] text-text-muted hover:text-text-secondary tabular-nums tracking-wide transition-colors"
        style={btnStyle}
        aria-label="Fit to view"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
        style={btnStyle}
        aria-label="Zoom in"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

