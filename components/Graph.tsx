"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { GraphNode } from "@/lib/types";

interface GraphData {
  nodes: GraphNode[];
  links: { source: string; target: string; reason: string }[];
}

interface Props {
  graphData: GraphData;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
}

export default function Graph({
  graphData,
  onNodeClick,
  selectedNodeId,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const tappedNodeRef = useRef<string | null>(null);
  const hoverStartTime = useRef<number>(0);
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

  // Configure forces on mount — scale physics based on screen size
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    const isMobile = dimensions.width < 768;
    const chargeStrength = isMobile ? -150 : -400;
    const chargeMax = isMobile ? 250 : 500;
    const linkDist = isMobile ? 50 : 100;
    const linkStr = isMobile ? 0.5 : 0.3;
    const padding = isMobile ? 30 : 60;

    fg.d3Force("charge").strength(chargeStrength).distanceMax(chargeMax);
    fg.d3Force("link").distance(linkDist).strength(linkStr);
    fg.d3Force("center", null);

    const p = isMobile ? 80 : 200;
    const t1 = setTimeout(() => fg.zoomToFit(600, p), 500);
    const t2 = setTimeout(() => fg.zoomToFit(800, p), 2000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions.width]);

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
    if (hoveredNode !== null) {
      hoverStartTime.current = performance.now();
    }
  }, [hoveredNode]);

  // Keep the engine alive — when it stops, restart it so hover always works
  const handleEngineStop = useCallback(() => {
    fgRef.current?.d3ReheatSimulation?.();
  }, []);

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

  // Drag end: release node — it's alive again, gently finds new equilibrium
  // The simulation was already reheated by the drag, so connected nodes
  // adjust around the new position. Low alpha decay means it settles slowly.
  const handleNodeDragEnd = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      node.fx = undefined;
      node.fy = undefined;
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
      const connections = node.val || 1;
      const radius = isMobile
        ? Math.sqrt(connections) * 3 + 2.5
        : Math.sqrt(connections) * 4.5 + 3.5;

      let nodeAlpha = 1;
      if (somethingHovered && isNeighbor) {
        const elapsed = performance.now() - hoverStartTime.current;
        nodeAlpha = Math.min(elapsed / 350, 1);
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      if (isDimmed) {
        ctx.fillStyle = themeVars.current.nodeDim;
      } else {
        ctx.globalAlpha =
          isNeighbor && nodeAlpha < 1 ? 0.3 + nodeAlpha * 0.7 : 1;
        ctx.fillStyle = node.color;
      }
      ctx.fill();
      ctx.globalAlpha = 1;

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
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const isMobile = dimensions.width < 768;
      const connections = node.val || 1;
      const radius = isMobile
        ? Math.sqrt(connections) * 3 + 2.5
        : Math.sqrt(connections) * 4.5 + 3.5;
      // Bigger hit area on mobile for fat fingers
      const hitRadius = isMobile ? Math.max(radius * 4, 20) : Math.max(radius * 3, 14);
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
          ctx.strokeStyle = "rgba(90, 90, 105, 0.08)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(midX, midY);
        ctx.strokeStyle = `rgba(160, 160, 180, ${0.2 + eased * 0.4})`;
        ctx.lineWidth = 0.8 + eased * 0.5;
        ctx.stroke();
      } else if (isSelectedLink) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = themeVars.current.lineHover;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      } else if (somethingHovered) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = themeVars.current.lineDim;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = themeVars.current.line;
        ctx.lineWidth = 0.6;
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
    <div ref={containerRef} className="w-full h-full absolute inset-0">
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
        onEngineStop={handleEngineStop}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        backgroundColor={graphBg}
        onRenderFramePre={paintBefore}
        warmupTicks={0}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.3}
        nodeId="id"
        nodeVal="val"
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
      />
    </div>
  );
}
