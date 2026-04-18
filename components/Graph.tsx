"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { forceCollide } from "d3-force";
import type { GraphNode } from "@/lib/types";

// sub-linear zoom response: screen radius = base * scale^ZOOM_K.
// k<1 damps the zoom: nodes look smaller than expected when zoomed in,
// bigger than expected when zoomed out, staying readable at every zoom.
const ZOOM_K = 0.65;
const ZOOM_FACTOR_MIN = 0.6;
const ZOOM_FACTOR_MAX = 1.6;

function baseRadius(node: { val?: number }, isMobile: boolean): number {
  const connections = node.val || 1;
  return isMobile
    ? Math.sqrt(connections) * 3 + 2.5
    : Math.sqrt(connections) * 4.5 + 3.5;
}

function zoomFactor(globalScale: number): number {
  return Math.min(
    ZOOM_FACTOR_MAX,
    Math.max(ZOOM_FACTOR_MIN, Math.pow(globalScale, ZOOM_K - 1))
  );
}

function nodeRadius(
  node: { val?: number },
  globalScale: number,
  isMobile: boolean
): number {
  return baseRadius(node, isMobile) * zoomFactor(globalScale);
}

interface GraphData {
  nodes: GraphNode[];
  links: { source: string; target: string; reason: string }[];
}

interface Props {
  graphData: GraphData;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  focusNodeId: string | null;
  paused?: boolean;
}

// alphaTarget floor — keeps the sim subtly drifting forever instead of
// decaying to a hard freeze. Library overrides this to 0 on drag-end so
// we re-apply it in handleNodeDragEnd.
const ALPHA_TARGET = 0.02;
// Number of initial ticks during which we recenter the centroid each frame.
// At d3AlphaDecay=0.008 the sim reaches ~alphaTarget around ~250 ticks; this
// covers the chaotic spread-out phase plus a safety margin.
const RECENTER_TICKS = 300;

export default function Graph({
  graphData,
  onNodeClick,
  selectedNodeId,
  focusNodeId,
  paused = false,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const tappedNodeRef = useRef<string | null>(null);
  const hoverStartTime = useRef<number>(0);
  // Persists across effect re-runs so a width change during mount (which
  // previously re-armed auto-fit with a fresh closure) can't override an
  // interaction that already happened.
  const userTookOverRef = useRef(false);
  // Counts ticks since mount. While below RECENTER_TICKS we pull the
  // centroid back to the origin each tick; after that we only damp
  // velocity, so drag-release doesn't snap the graph back.
  const tickCountRef = useRef(0);
  const [graphBg, setGraphBg] = useState("#262626");
  const themeVars = useRef({
    line: "rgba(90,90,105,0.18)",
    lineHover: "rgba(150,150,165,0.55)",
    lineDim: "rgba(70,70,80,0.06)",
    nodeDim: "rgba(80,80,90,0.25)",
    label: "rgba(160,160,175,0.5)",
    labelHover: "rgba(210,210,220,0.9)",
    labelDim: "rgba(160,160,175,0.08)",
    grid: "rgba(120,120,140,0.04)",
    ring: "rgba(220,220,230,0.3)",
    traverseTrail: "rgba(90,90,105,0.08)",
    traverseHeadRgb: "160, 160, 180",
  });

  useEffect(() => {
    const readTheme = () => {
      const s = getComputedStyle(document.documentElement);
      const g = (v: string, fallback: string) => s.getPropertyValue(v).trim() || fallback;
      setGraphBg(g("--graph-bg", "#262626"));
      themeVars.current = {
        line: g("--graph-line", "rgba(90,90,105,0.18)"),
        lineHover: g("--graph-line-hover", "rgba(150,150,165,0.55)"),
        lineDim: g("--graph-line-dim", "rgba(70,70,80,0.06)"),
        nodeDim: g("--graph-node-dim", "rgba(80,80,90,0.25)"),
        label: g("--graph-label", "rgba(160,160,175,0.5)"),
        labelHover: g("--graph-label-hover", "rgba(210,210,220,0.9)"),
        labelDim: g("--graph-label-dim", "rgba(160,160,175,0.08)"),
        grid: g("--graph-grid", "rgba(120,120,140,0.04)"),
        ring: g("--graph-ring", "rgba(220,220,230,0.3)"),
        traverseTrail: g("--graph-traverse-trail", "rgba(90,90,105,0.08)"),
        traverseHeadRgb: g("--graph-traverse-head-rgb", "160, 160, 180"),
      };
    };
    readTheme();
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    setDimensions({
      width: container.clientWidth,
      height: container.clientHeight,
    });
    return () => observer.disconnect();
  }, []);

  // Force configuration — scales with viewport so mobile/desktop feel the
  // same. Re-runs on width change. Deliberately does NOT schedule auto-fit
  // or attach interaction listeners: those belong in a mount-only effect
  // (below) so a stray width change can't re-arm them.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    const isMobile = dimensions.width < 768;
    const chargeStrength = isMobile ? -250 : -600;
    const chargeMax = isMobile ? 400 : 800;
    const linkDist = isMobile ? 80 : 160;
    const linkStr = isMobile ? 0.2 : 0.08;
    const collidePad = isMobile ? 1.5 : 2;

    fg.d3Force("charge").strength(chargeStrength).distanceMax(chargeMax);
    fg.d3Force("link").distance(linkDist).strength(linkStr);
    fg.d3Force("center", null);
    fg.d3Force(
      "collide",
      forceCollide()
        .radius(
          (n) =>
            baseRadius(n as { val?: number }, isMobile) * ZOOM_FACTOR_MAX +
            collidePad
        )
        .strength(1)
        .iterations(3)
    );
    // Permanent alpha floor so the sim never decays to a hard freeze.
    // Set imperatively because the prop isn't in the library's TS types.
    fg.d3AlphaTarget?.(ALPHA_TARGET);
  }, [dimensions.width]);

  // Mount-only: one auto-fit pass + capture-phase listeners that cancel it
  // on the first genuine user interaction. userTookOverRef is module-scoped
  // to this component instance so no closure reset can un-remember it.
  useEffect(() => {
    const container = containerRef.current;
    let cancelled = false;
    let fitTimer: number | null = null;
    let rafId: number | null = null;

    const schedule = () => {
      const fg = fgRef.current;
      if (!fg) {
        rafId = requestAnimationFrame(schedule);
        return;
      }
      const isMobile = window.innerWidth < 768;
      const p = isMobile ? 40 : 120;
      fitTimer = window.setTimeout(() => {
        if (cancelled || userTookOverRef.current) return;
        fg.zoomToFit(500, p);
      }, 300);
    };
    rafId = requestAnimationFrame(schedule);

    const takeOver = () => {
      if (userTookOverRef.current) return;
      userTookOverRef.current = true;
      if (fitTimer !== null) clearTimeout(fitTimer);
    };
    const capture: AddEventListenerOptions = { capture: true, passive: true };
    container?.addEventListener("wheel", takeOver, capture);
    container?.addEventListener("pointerdown", takeOver, capture);
    container?.addEventListener("touchstart", takeOver, capture);

    return () => {
      cancelled = true;
      if (fitTimer !== null) clearTimeout(fitTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      container?.removeEventListener("wheel", takeOver, capture);
      container?.removeEventListener("pointerdown", takeOver, capture);
      container?.removeEventListener("touchstart", takeOver, capture);
    };
  }, []);

  // Pause/resume the library's render loop when this graph is hidden by
  // PageClient. Preserves node positions / alpha / velocities across toggles.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    if (paused) {
      fg.pauseAnimation?.();
    } else {
      fg.resumeAnimation?.();
    }
  }, [paused]);

  useEffect(() => {
    if (!focusNodeId || !fgRef.current) return;
    const fg = fgRef.current;
    if (!fg) return;
    // d3-force mutates node objects in place, adding x/y directly on them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gNode = graphData.nodes.find((n) => n.id === focusNodeId) as any;
    if (gNode?.x != null && gNode?.y != null) {
      fg.centerAt(gNode.x, gNode.y, 800);
      fg.zoom(3, 800);
      setHoveredNode(focusNodeId);
    }
  }, [focusNodeId, graphData.nodes]);

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
    if (hoveredNode !== null) {
      hoverStartTime.current = performance.now();
    }
  }, [hoveredNode]);

  useEffect(() => {
    if (hoveredNode === null) return;
    let running = true;
    let raf = 0;
    const tick = () => {
      if (!running) return;
      if (performance.now() - hoverStartTime.current < 500) {
        fgRef.current?.refresh?.();
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [hoveredNode]);

  // Drag: pin node while dragging
  const handleNodeDrag = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      node.fx = node.x;
      node.fy = node.y;
    },
    []
  );

  // Zero net linear momentum each tick, and also recenter the position
  // centroid during the first RECENTER_TICKS ticks. With alphaTarget > 0
  // the sim runs forever; tiny numerical asymmetries in charge/collide
  // accumulate into a net velocity that slowly translates the whole graph.
  // Velocity damping pins future drift. The initial chaotic spread-out
  // phase also shifts the centroid (random initial positions + strong
  // charge), so during that window we additionally subtract the mean
  // position. After the window we leave positions alone, so drag-release
  // won't snap the graph back.
  const handleEngineTick = useCallback(() => {
    // d3-force mutates the node objects we pass in as props, adding
    // vx/vy/x/y in place — so reading graphData.nodes here is the live sim
    // state, not a stale copy.
    const nodes = graphData.nodes as unknown as Array<{
      x?: number;
      y?: number;
      vx?: number;
      vy?: number;
      fx?: number | null;
      fy?: number | null;
    }>;
    if (!nodes.length) return;
    tickCountRef.current++;
    const recenterPos = tickCountRef.current <= RECENTER_TICKS;
    let sumX = 0;
    let sumY = 0;
    let sumVx = 0;
    let sumVy = 0;
    let count = 0;
    for (const n of nodes) {
      if (n.fx != null || n.fy != null) continue; // skip pinned (dragged)
      sumX += n.x ?? 0;
      sumY += n.y ?? 0;
      sumVx += n.vx ?? 0;
      sumVy += n.vy ?? 0;
      count++;
    }
    if (!count) return;
    const avgX = sumX / count;
    const avgY = sumY / count;
    const avgVx = sumVx / count;
    const avgVy = sumVy / count;
    for (const n of nodes) {
      if (n.fx != null || n.fy != null) continue;
      if (recenterPos) {
        n.x = (n.x ?? 0) - avgX;
        n.y = (n.y ?? 0) - avgY;
      }
      n.vx = (n.vx ?? 0) - avgVx;
      n.vy = (n.vy ?? 0) - avgVy;
    }
  }, [graphData.nodes]);

  // Drag end: release node, then restore the permanent alpha floor. The
  // library stomps alphaTarget → 0 internally on dragEnd ("release engine
  // low intensity") — without this re-apply, the sim would decay to a hard
  // freeze after the first drag.
  const handleNodeDragEnd = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      node.fx = undefined;
      node.fy = undefined;
      fgRef.current?.d3AlphaTarget?.(ALPHA_TARGET);
    },
    []
  );

  // Neighbor map
  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of graphData.links) {
      const src =
        typeof link.source === "object"
          ? (link.source as GraphNode).id
          : link.source;
      const tgt =
        typeof link.target === "object"
          ? (link.target as GraphNode).id
          : link.target;
      if (!map.has(src)) map.set(src, new Set());
      if (!map.has(tgt)) map.set(tgt, new Set());
      map.get(src)!.add(tgt);
      map.get(tgt)!.add(src);
    }
    return map;
  }, [graphData.links]);

  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      const isMobile = dimensions.width < 768;
      if (isMobile) {
        if (tappedNodeRef.current === node.id) {
          onNodeClick(node.id);
          tappedNodeRef.current = null;
          setHoveredNode(null);
        } else {
          tappedNodeRef.current = node.id;
          setHoveredNode(node.id);
        }
      } else {
        setHoveredNode(null);
        onNodeClick(node.id);
      }
    },
    [onNodeClick, dimensions.width]
  );

  const handleBackgroundClick = useCallback(() => {
    setHoveredNode(null);
    tappedNodeRef.current = null;
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    if (dimensions.width >= 768) {
      setHoveredNode(node?.id ?? null);
    }
  }, [dimensions.width]);

  const paintNode = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const hovered = hoveredNodeRef.current;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hovered;
      const isNeighbor = hovered !== null && neighbors.get(hovered)?.has(node.id);
      const somethingHovered = hovered !== null;
      const isDimmed = somethingHovered && !isHovered && !isNeighbor;

      const isMobile = dimensions.width < 768;
      const radius = nodeRadius(node, globalScale, isMobile);

      let nodeAlpha = 1;
      if (somethingHovered && isNeighbor) {
        const elapsed = performance.now() - hoverStartTime.current;
        nodeAlpha = Math.min(elapsed / 350, 1);
      }

      const isPhantom = !!(node as GraphNode).phantom;

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      if (isDimmed) {
        ctx.fillStyle = themeVars.current.nodeDim;
      } else if (isPhantom) {
        ctx.globalAlpha = isNeighbor && nodeAlpha < 1 ? 0.3 + nodeAlpha * 0.7 : 0.5;
        ctx.fillStyle = node.color;
      } else {
        ctx.globalAlpha =
          isNeighbor && nodeAlpha < 1 ? 0.3 + nodeAlpha * 0.7 : 1;
        ctx.fillStyle = node.color;
      }
      ctx.fill();
      ctx.globalAlpha = 1;

      if (isPhantom && !isDimmed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = themeVars.current.ring;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (isHovered || isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 2.5, 0, 2 * Math.PI);
        ctx.strokeStyle = themeVars.current.ring;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      const fontSize = isMobile
        ? Math.min(9 / globalScale, 11)
        : Math.min(11 / globalScale, 13);
      if (fontSize >= 1.5) {
        ctx.font = `400 ${fontSize}px Inter, -apple-system, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        if (isDimmed) {
          ctx.fillStyle = themeVars.current.labelDim;
        } else if (isHovered || isSelected) {
          ctx.fillStyle = themeVars.current.labelHover;
        } else {
          ctx.fillStyle = themeVars.current.label;
        }
        ctx.fillText(node.title, node.x, node.y + radius + 4);
      }
    },
    [selectedNodeId, neighbors, dimensions.width]
  );

  const paintNodeArea = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isMobile = dimensions.width < 768;
      const radius = nodeRadius(node, globalScale, isMobile);
      // Bigger hit area on mobile for fat fingers
      const hitRadius = isMobile ? Math.max(radius * 1.5, 12) : radius;
      ctx.beginPath();
      ctx.arc(node.x, node.y, hitRadius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [dimensions.width]
  );

  const paintLink = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any, ctx: CanvasRenderingContext2D) => {
      const src =
        typeof link.source === "object"
          ? link.source
          : { id: link.source, x: 0, y: 0 };
      const tgt =
        typeof link.target === "object"
          ? link.target
          : { id: link.target, x: 0, y: 0 };

      const hovered = hoveredNodeRef.current;
      const isHoveredLink =
        hovered !== null &&
        (src.id === hovered || tgt.id === hovered);
      const isSelectedLink =
        selectedNodeId !== null &&
        (src.id === selectedNodeId || tgt.id === selectedNodeId);
      const somethingHovered = hovered !== null;

      if (isHoveredLink) {
        const elapsed = performance.now() - hoverStartTime.current;
        const progress = Math.min(elapsed / 300, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const fromX = src.id === hovered ? src.x : tgt.x;
        const fromY = src.id === hovered ? src.y : tgt.y;
        const toX = src.id === hovered ? tgt.x : src.x;
        const toY = src.id === hovered ? tgt.y : src.y;

        const midX = fromX + (toX - fromX) * eased;
        const midY = fromY + (toY - fromY) * eased;

        if (eased < 1) {
          ctx.beginPath();
          ctx.moveTo(midX, midY);
          ctx.lineTo(toX, toY);
          ctx.strokeStyle = themeVars.current.traverseTrail;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(midX, midY);
        ctx.strokeStyle = `rgba(${themeVars.current.traverseHeadRgb}, ${0.2 + eased * 0.4})`;
        ctx.lineWidth = 1.0 + eased * 0.6;
        ctx.stroke();
      } else if (isSelectedLink) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = themeVars.current.lineHover;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (somethingHovered) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = themeVars.current.lineDim;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = themeVars.current.line;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    },
    [selectedNodeId]
  );

  const paintBefore = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (globalScale < 0.3) return;

      const gridSize = 60;
      ctx.strokeStyle = themeVars.current.grid;
      ctx.lineWidth = 0.5 / globalScale;

      const topLeft = fgRef.current?.screen2GraphCoords(0, 0);
      const bottomRight = fgRef.current?.screen2GraphCoords(
        dimensions.width,
        dimensions.height
      );
      if (!topLeft || !bottomRight) return;

      const startX = Math.floor(topLeft.x / gridSize) * gridSize;
      const startY = Math.floor(topLeft.y / gridSize) * gridSize;
      const endX = Math.ceil(bottomRight.x / gridSize) * gridSize;
      const endY = Math.ceil(bottomRight.y / gridSize) * gridSize;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
    },
    [dimensions]
  );

  return (
    <div ref={containerRef} role="img" aria-label="Interactive knowledge graph" className="w-full h-full absolute inset-0">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => "replace"}
        nodePointerAreaPaint={paintNodeArea}
        linkCanvasObject={paintLink}
        linkCanvasObjectMode={() => "replace"}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onEngineTick={handleEngineTick}
        backgroundColor={graphBg}
        onRenderFramePre={paintBefore}
        warmupTicks={0}
        d3AlphaDecay={0.008}
        d3AlphaMin={0}
        cooldownTime={Infinity}
        d3VelocityDecay={0.4}
        nodeId="id"
        nodeVal="val"
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
      />
    </div>
  );
}
