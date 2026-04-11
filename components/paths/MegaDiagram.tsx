"use client";

import type { GraphNode } from "@/lib/types";
import type { MegaEdge, MegaLayout, MegaNode } from "@/lib/paths-sim";

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
  onApeirronPointerDown: (e: React.PointerEvent) => void;
  // When true, skip rendering Apeirron itself and its hub edges. Used by
  // MiniPathDiagram where the single-path view doesn't need the root hub.
  hideApeirron?: boolean;
}

export default function MegaDiagram({
  layout,
  byId,
  selectedNodeId,
  draggingPathId,
  onNodeClick,
  onNodePointerDown,
  onApeirronPointerDown,
  hideApeirron,
}: MegaDiagramProps) {
  const apeirron = layout.apeirron;
  return (
    <svg
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Apeirron paths map"
    >
      {/* Hub edges: Apeirron → each category pivot. Pivot is the rotation
          center, so these endpoints stay anchored no matter how a path tilts.
          Wrapped per-edge so unfocused hubs can dim with their path.
          Skipped entirely when Apeirron is hidden (mini view). */}
      {!hideApeirron &&
        layout.hubEdges.map((edge) => (
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
      {/* Apeirron itself: never rotates, rendered on top. Grabbing it drags
          the whole diagram via a global offset. */}
      {!hideApeirron && (
        <foreignObject
          key={apeirron.key}
          x={apeirron.x}
          y={apeirron.y}
          width={apeirron.width}
          height={apeirron.height}
          overflow="visible"
        >
          <NodeBox
            node={apeirron}
            real={undefined}
            isSelected={false}
            isDragging={false}
            onClick={() => {}}
            onNodePointerDown={onNodePointerDown}
            onApeirronPointerDown={onApeirronPointerDown}
          />
        </foreignObject>
      )}
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
  onApeirronPointerDown?: (e: React.PointerEvent) => void;
}

function NodeBox({
  node,
  real,
  isSelected,
  isDragging,
  onClick,
  onNodePointerDown,
  onApeirronPointerDown,
}: NodeBoxProps) {
  if (node.kind === "apeirron") {
    return (
      <div
        onPointerDown={onApeirronPointerDown}
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
