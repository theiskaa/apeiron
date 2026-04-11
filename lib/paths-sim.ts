// Pure physics + layout helpers for the PathsGraph canvas. All state is
// passed in explicitly — this module holds no refs or React bindings, so
// both the main PathsGraph and the MiniPathDiagram can call into it with
// independent sim state.

import type { ReadingPath } from "./paths";
import { layoutPathWithCategory, type PathLayout } from "./paths-layout";

export const APEIRON_ID = "__apeirron";
export const APEIRON_WIDTH = 300;
export const APEIRON_HEIGHT = 150;
export const HORIZONTAL_GAP = 16;
export const APEIRON_GAP = 260;
export const APEIRON_TOP_PADDING = 280;
export const CANVAS_BOTTOM_PADDING = 100;

export const PATH_COLORS: Record<string, string> = {
  "genesis": "#c4855c",
  "the-architecture": "#b5616a",
  "the-hidden-hand": "#9683b7",
  "the-dynasties": "#a87f98",
  "shattered-history": "#b89458",
  "forbidden-science": "#6790b5",
  "lost-worlds": "#c9a46f",
  "the-cosmic-question": "#549e93",
};

// Per-frame stiffness of the weak "return to base" position spring.
// Low enough that the link-spring wave dominates during motion.
export const POS_K = 0.018;
// Per-frame stiffness of the shape-preserving spring on each layout edge.
// Main source of the jiggle — cursor yanks propagate through the link graph.
export const LINK_K = 0.065;
// Velocity retained per frame (<1). Lower = overdamped, higher = more oscillation.
export const DAMPING = 0.86;
// Sleep threshold in content pixels — sim halts per-path when below.
export const EPS = 0.08;

// Radians per content-pixel of horizontal displacement-from-target.
// Average lag of ~60 px should produce ~3° of tilt.
export const DISP_TO_ANGLE = 0.0009;
// Hard cap (radians, ~5.7°). Keeps the path from looking flipped on a hard fling.
export const MAX_TILT = 0.1;
// Spring constants on the angle itself — separate from node physics.
export const ANGLE_K = 0.16;
export const ANGLE_DAMP = 0.82;

// Per-frame push strength per pixel of (margin-inflated) overlap.
export const COLLISION_K = 0.11;
// Padding around each node's AABB so repulsion kicks in before visual contact.
export const COLLISION_MARGIN = 14;

// Per-frame gravitational acceleration (acceleration, not force — mass-independent).
// Kept small so resting sag is imperceptible (~1–2 px under the position spring).
export const GRAVITY = 0.02;
// Mass formula from path depth: mass = 1 + depth * DEPTH_MASS_COEFF.
// Root nodes are light, leaves are heavier → ripple slows as it propagates.
export const DEPTH_MASS_COEFF = 0.35;

// Per-frame speeds below this get no velocity squish (avoids subpixel noise).
export const SQUISH_THRESHOLD = 1;
// Stretch factor per unit of speed past the threshold.
export const SQUISH_K = 0.012;
// Hard cap on the stretch (0.15 ≈ 15% max axis distortion).
export const SQUISH_MAX = 0.15;

// One-shot settle pop when a path transitions hot → rest. Keeps the sim
// "hot" for this many ms so the rAF loop drives the scale animation.
export const BUMP_DURATION_MS = 280;
// Peak scale amplitude at the apex of the half-sine.
export const BUMP_AMP = 0.028;

export type PointXY = { x: number; y: number };

export interface BasePlacement {
  path: ReadingPath;
  layout: PathLayout;
  color: string;
  baseOffsetX: number;
  baseOffsetY: number;
  orderMap: Map<string, number>;
}

export interface ApeirronPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BaseLayout {
  placements: BasePlacement[];
  apeirron: ApeirronPos;
  width: number;
  height: number;
}

export interface SimNode {
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

export interface SimLink {
  from: string;
  to: string;
  restDx: number;
  restDy: number;
}

export interface PathSim {
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
  // top-center — which is also where the Apeirron hub edge lands, so that
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

export interface MegaNode {
  key: string;
  pathId: string;
  nodeId: string;
  kind: "apeirron" | "category" | "node";
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

export interface MegaEdge {
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

export interface MegaPathGroup {
  pathId: string;
  nodes: MegaNode[];
  edges: MegaEdge[];
  // SVG rotation: angle (degrees) around (cx, cy).
  // Pivot is the category's top-center so the Apeirron hub edge endpoint
  // stays fixed as the path tilts.
  angleDeg: number;
  cx: number;
  cy: number;
}

export interface MegaLayout {
  apeirron: MegaNode;
  hubEdges: MegaEdge[];
  pathGroups: MegaPathGroup[];
  width: number;
  height: number;
}

// --- Base layout (Apeirron + path placements, one row) ---

export function computeBase(paths: ReadingPath[]): BaseLayout {
  const allLayouts = paths.map((path) => {
    const orderMap = new Map<string, number>();
    path.nodes.forEach((pn, i) => orderMap.set(pn.id, i + 1));
    return {
      path,
      layout: layoutPathWithCategory(path),
      color: PATH_COLORS[path.id] ?? "#8a8a99",
      orderMap,
    };
  });

  if (allLayouts.length === 0) {
    return {
      placements: [],
      apeirron: {
        x: 0,
        y: APEIRON_TOP_PADDING,
        width: APEIRON_WIDTH,
        height: APEIRON_HEIGHT,
      },
      width: APEIRON_WIDTH + 400,
      height:
        APEIRON_TOP_PADDING +
        APEIRON_HEIGHT +
        APEIRON_GAP +
        CANVAS_BOTTOM_PADDING,
    };
  }

  const maxHeight = Math.max(...allLayouts.map((l) => l.layout.height));
  const rowWidth =
    allLayouts.reduce((sum, l) => sum + l.layout.width, 0) +
    (allLayouts.length - 1) * HORIZONTAL_GAP;

  const canvasWidth = Math.max(rowWidth, APEIRON_WIDTH + 400);
  const rowStartX = (canvasWidth - rowWidth) / 2;
  const apeirronY = APEIRON_TOP_PADDING;
  const rowY = apeirronY + APEIRON_HEIGHT + APEIRON_GAP;
  const canvasHeight = rowY + maxHeight + CANVAS_BOTTOM_PADDING;
  const apeirronX = canvasWidth / 2 - APEIRON_WIDTH / 2;

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
    apeirron: {
      x: apeirronX,
      y: apeirronY,
      width: APEIRON_WIDTH,
      height: APEIRON_HEIGHT,
    },
    width: canvasWidth,
    height: canvasHeight,
  };
}

// --- Sim initialization ---

export function initSims(base: BaseLayout): Map<string, PathSim> {
  const sims = new Map<string, PathSim>();
  for (const p of base.placements) {
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
          kind === "category"
            ? p.layout.categoryNodeWidth
            : p.layout.nodeWidth,
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

// --- Inter-path collisions ---

// Pairwise inter-path soft collision. Runs once per tick across all sims,
// BEFORE stepSim. Pinned nodes (locked to the cursor) act as immovable walls:
// they still get tested for overlap, but only the non-pinned counterpart
// receives the resulting push. Collision wakes any affected sim so it gets
// integrated this tick.
export function applyInterCollisions(sims: Map<string, PathSim>): void {
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

export function stepSim(sim: PathSim, globalOffset: PointXY): boolean {
  // Effective target offset is the path's own offset plus the global offset
  // from an Apeirron drag. Both additively shift where each node wants to be.
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
  // tilt. Scaled by inertiaScale so heavier paths (more/deeper nodes)
  // resist rotation proportionally.
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

export function buildMegaLayout(
  sims: Map<string, PathSim>,
  globalOffset: PointXY,
  base: BaseLayout
): MegaLayout {
  // Apeirron is the only thing that renders at globalOffset directly — every
  // other node's sim position already reflects the global shift via stepSim's
  // target calculation.
  const apeirronX = base.apeirron.x + globalOffset.x;
  const apeirronY = base.apeirron.y + globalOffset.y;
  const apeirron: MegaNode = {
    key: APEIRON_ID,
    pathId: APEIRON_ID,
    nodeId: APEIRON_ID,
    kind: "apeirron",
    x: apeirronX,
    y: apeirronY,
    width: base.apeirron.width,
    height: base.apeirron.height,
    color: "#d8d8e0",
    title: "Apeirron",
  };

  const hubEdges: MegaEdge[] = [];
  const pathGroups: MegaPathGroup[] = [];

  let maxX = apeirronX + base.apeirron.width;
  let maxY = apeirronY + base.apeirron.height;

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
        const sy = bumpScale / s;
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
    // at this point (the Apeirron hub edge) stays visually stable while the
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
          x1: apeirronX + base.apeirron.width / 2,
          y1: apeirronY + base.apeirron.height,
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
    apeirron,
    hubEdges,
    pathGroups,
    width: Math.max(maxX, base.width),
    height: Math.max(maxY, base.height),
  };
}
