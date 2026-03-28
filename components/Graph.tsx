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
  // On mobile, first tap "selects" (highlights connections), second tap opens
  const [tappedNode, setTappedNode] = useState<string | null>(null);
  const hoverStartTime = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

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

    const t1 = setTimeout(() => fg.zoomToFit(600, padding), 500);
    const t2 = setTimeout(() => fg.zoomToFit(800, padding), 2000);
    const t3 = setTimeout(() => fg.zoomToFit(800, padding), 4000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions.width]);

  // Hover animation loop
  useEffect(() => {
    if (hoveredNode === null) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    hoverStartTime.current = performance.now();
    let running = true;
    const tickle = () => {
      if (!running) return;
      fgRef.current?.refresh?.();
      if (performance.now() - hoverStartTime.current < 450) {
        animFrameRef.current = requestAnimationFrame(tickle);
      }
    };
    animFrameRef.current = requestAnimationFrame(tickle);
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
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
        // Mobile: first tap highlights, second tap opens
        if (tappedNode === node.id) {
          // Second tap — open the node
          onNodeClick(node.id);
          setTappedNode(null);
          setHoveredNode(null);
        } else {
          // First tap — highlight connections
          setTappedNode(node.id);
          setHoveredNode(node.id);
          hoverStartTime.current = performance.now();
        }
      } else {
        onNodeClick(node.id);
      }
    },
    [onNodeClick, tappedNode, dimensions.width]
  );

  // Tap empty space on mobile to deselect
  const handleBackgroundClick = useCallback(() => {
    if (dimensions.width < 768 && tappedNode) {
      setTappedNode(null);
      setHoveredNode(null);
    }
  }, [tappedNode, dimensions.width]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    // Only use hover on desktop
    if (dimensions.width >= 768) {
      setHoveredNode(node?.id ?? null);
    }
  }, [dimensions.width]);

  const paintNode = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNode;
      const isNeighbor =
        hoveredNode !== null && neighbors.get(hoveredNode)?.has(node.id);
      const somethingHovered = hoveredNode !== null;
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
        ctx.fillStyle = "rgba(80, 80, 90, 0.25)";
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
        ctx.strokeStyle = "rgba(220, 220, 230, 0.3)";
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
          ctx.fillStyle = "rgba(160, 160, 175, 0.08)";
        } else if (isHovered || isSelected) {
          ctx.fillStyle = "rgba(210, 210, 220, 0.9)";
        } else {
          ctx.fillStyle = "rgba(160, 160, 175, 0.5)";
        }
        ctx.fillText(node.title, node.x, node.y + radius + 4);
      }
    },
    [selectedNodeId, hoveredNode, neighbors, dimensions.width]
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

      const isHoveredLink =
        hoveredNode !== null &&
        (src.id === hoveredNode || tgt.id === hoveredNode);
      const isSelectedLink =
        selectedNodeId !== null &&
        (src.id === selectedNodeId || tgt.id === selectedNodeId);
      const somethingHovered = hoveredNode !== null;

      if (isHoveredLink) {
        const elapsed = performance.now() - hoverStartTime.current;
        const progress = Math.min(elapsed / 300, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const fromX = src.id === hoveredNode ? src.x : tgt.x;
        const fromY = src.id === hoveredNode ? src.y : tgt.y;
        const toX = src.id === hoveredNode ? tgt.x : src.x;
        const toY = src.id === hoveredNode ? tgt.y : src.y;

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
        ctx.strokeStyle = "rgba(130, 130, 145, 0.4)";
        ctx.lineWidth = 0.9;
        ctx.stroke();
      } else if (somethingHovered) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = "rgba(70, 70, 80, 0.06)";
        ctx.lineWidth = 0.4;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = "rgba(90, 90, 105, 0.18)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    },
    [hoveredNode, selectedNodeId]
  );

  const paintBefore = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (globalScale < 0.3) return;

      const gridSize = 60;
      const alpha = Math.min(globalScale * 0.04, 0.06);
      ctx.strokeStyle = `rgba(120, 120, 140, ${alpha})`;
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
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        backgroundColor="#202024"
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
