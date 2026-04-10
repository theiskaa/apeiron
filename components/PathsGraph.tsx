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
const APEIRON_WIDTH = 260;
const APEIRON_HEIGHT = 92;
const HORIZONTAL_GAP = 16;
const APEIRON_GAP = 260;
const APEIRON_TOP_PADDING = 280;
const CANVAS_BOTTOM_PADDING = 100;

const OFFSETS_STORAGE_KEY = "apeiron-path-offsets";

type PointXY = { x: number; y: number };
type PathOffsets = Record<string, PointXY>;

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
  orderIndex?: number;
}

interface MegaEdge {
  key: string;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  emphasis: "normal" | "hub";
}

interface MegaLayout {
  nodes: MegaNode[];
  edges: MegaEdge[];
  width: number;
  height: number;
}

function computeMegaLayout(offsets: PathOffsets): MegaLayout {
  const nodes: MegaNode[] = [];
  const edges: MegaEdge[] = [];

  nodes.push({
    key: APEIRON_ID,
    pathId: APEIRON_ID,
    nodeId: APEIRON_ID,
    kind: "apeiron",
    x: BASE.apeiron.x,
    y: BASE.apeiron.y,
    width: BASE.apeiron.width,
    height: BASE.apeiron.height,
    color: "#d8d8e0",
    title: "Apeiron",
  });

  let maxX = BASE.apeiron.x + BASE.apeiron.width;
  let maxY = BASE.apeiron.y + BASE.apeiron.height;

  for (const p of BASE.placements) {
    const off = offsets[p.path.id] ?? { x: 0, y: 0 };
    const ox = p.baseOffsetX + off.x;
    const oy = p.baseOffsetY + off.y;

    for (const n of p.layout.nodes) {
      const absX = n.x + ox;
      const absY = n.y + oy;
      nodes.push({
        key: `${p.path.id}::${n.id}`,
        pathId: p.path.id,
        nodeId: n.id,
        kind: n.kind === "category" ? "category" : "node",
        x: absX,
        y: absY,
        width: p.layout.nodeWidth,
        height: p.layout.nodeHeight,
        color: p.color,
        title: n.kind === "category" ? p.path.title : undefined,
        orderIndex:
          n.kind === "category" ? undefined : p.orderMap.get(n.id),
      });
      if (absX + p.layout.nodeWidth > maxX) maxX = absX + p.layout.nodeWidth;
      if (absY + p.layout.nodeHeight > maxY) maxY = absY + p.layout.nodeHeight;
    }

    for (const e of p.layout.edges) {
      edges.push({
        key: `${p.path.id}::${e.from}->${e.to}`,
        color: p.color,
        x1: e.x1 + ox,
        y1: e.y1 + oy,
        x2: e.x2 + ox,
        y2: e.y2 + oy,
        emphasis: "normal",
      });
    }

    const cat = p.layout.nodes.find((n) => n.kind === "category");
    if (cat) {
      const catCenterX = cat.x + ox + p.layout.nodeWidth / 2;
      edges.push({
        key: `hub->${p.path.id}`,
        color: p.color,
        x1: BASE.apeiron.x + BASE.apeiron.width / 2,
        y1: BASE.apeiron.y + BASE.apeiron.height,
        x2: catCenterX,
        y2: cat.y + oy,
        emphasis: "hub",
      });
    }
  }

  return {
    nodes,
    edges,
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

  const [pathOffsets, setPathOffsets] = useState<PathOffsets>({});
  const [draggingPathId, setDraggingPathId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(OFFSETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") setPathOffsets(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OFFSETS_STORAGE_KEY, JSON.stringify(pathOffsets));
    } catch {}
  }, [pathOffsets]);

  const megaLayout = useMemo(() => computeMegaLayout(pathOffsets), [pathOffsets]);

  const handleCategoryPointerDown = useCallback(
    (e: React.PointerEvent, pathId: string) => {
      e.stopPropagation();
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startOffset = pathOffsets[pathId] ?? { x: 0, y: 0 };
      setDraggingPathId(pathId);

      const handleMove = (ev: PointerEvent) => {
        const scale = transformRef.current.scale || 1;
        const dx = (ev.clientX - startClientX) / scale;
        const dy = (ev.clientY - startClientY) / scale;
        setPathOffsets((prev) => ({
          ...prev,
          [pathId]: { x: startOffset.x + dx, y: startOffset.y + dy },
        }));
      };

      const handleUp = () => {
        setDraggingPathId(null);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [pathOffsets]
  );

  const handleResetLayout = useCallback(() => {
    setPathOffsets({});
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: "var(--graph-bg, #262626)" }}
    >
      <div className="hidden md:block absolute inset-0">
        <CanvasViewport
          transform={transform}
          setTransform={setTransform}
          contentWidth={megaLayout.width}
          contentHeight={megaLayout.height}
          onResetLayout={handleResetLayout}
          hasDrags={Object.keys(pathOffsets).length > 0}
        >
          <MegaDiagram
            layout={megaLayout}
            byId={byId}
            selectedNodeId={selectedNodeId}
            draggingPathId={draggingPathId}
            onNodeClick={onNodeClick}
            onCategoryPointerDown={handleCategoryPointerDown}
          />
        </CanvasViewport>
      </div>

      <div className="block md:hidden absolute inset-0 overflow-y-auto panel-scroll">
        <div className="px-4 pt-28 pb-24 space-y-10">
          {READING_PATHS.map((path) => (
            <MobileList
              key={path.id}
              path={path}
              color={PATH_COLORS[path.id] ?? "#8a8a99"}
              byId={byId}
              selectedNodeId={selectedNodeId}
              onNodeClick={onNodeClick}
            />
          ))}
        </div>
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
  onCategoryPointerDown: (e: React.PointerEvent, pathId: string) => void;
}

function MegaDiagram({
  layout,
  byId,
  selectedNodeId,
  draggingPathId,
  onNodeClick,
  onCategoryPointerDown,
}: MegaDiagramProps) {
  return (
    <svg
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Apeiron paths map"
    >
      <g>
        {layout.edges.map((edge) => (
          <EdgePath key={edge.key} edge={edge} />
        ))}
      </g>
      <g>
        {layout.nodes.map((n) => (
          <foreignObject
            key={n.key}
            x={n.x}
            y={n.y}
            width={n.width}
            height={n.height}
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
              onCategoryPointerDown={onCategoryPointerDown}
            />
          </foreignObject>
        ))}
      </g>
    </svg>
  );
}

function EdgePath({ edge }: { edge: MegaEdge }) {
  const dy = edge.y2 - edge.y1;
  const isHub = edge.emphasis === "hub";
  const edgeColor = isHub
    ? `color-mix(in srgb, ${edge.color} 55%, transparent)`
    : `color-mix(in srgb, ${edge.color} 32%, transparent)`;
  const arrowColor = `color-mix(in srgb, ${edge.color} 68%, transparent)`;
  const strokeWidth = isHub ? 1.8 : 1.4;

  // Vertical control points — our edges always conceptually emerge from
  // top/bottom of a box, so tangents are vertical even when horizontal
  // distance is large (hub edges fanning to far paths).
  const off = Math.max(30, Math.abs(dy) * 0.5) * Math.sign(dy || 1);
  const d = `M ${edge.x1} ${edge.y1} C ${edge.x1} ${edge.y1 + off}, ${edge.x2} ${edge.y2 - off}, ${edge.x2} ${edge.y2}`;

  const tangentY = Math.sign(dy || 1);
  const backLen = 7;
  const wingLen = 5;
  const bx = edge.x2;
  const by = edge.y2 - tangentY * backLen;
  const arrow = `M ${bx - wingLen} ${by} L ${edge.x2} ${edge.y2} L ${bx + wingLen} ${by}`;

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
  onCategoryPointerDown: (e: React.PointerEvent, pathId: string) => void;
}

function NodeBox({
  node,
  real,
  isSelected,
  isDragging,
  onClick,
  onCategoryPointerDown,
}: NodeBoxProps) {
  if (node.kind === "apeiron") {
    return (
      <div
        className="relative w-full h-full flex items-center justify-center gap-3 rounded-xl select-none"
        style={{
          backgroundColor: `color-mix(in srgb, ${node.color} 18%, transparent)`,
          boxShadow: `inset 0 0 0 1.5px ${node.color}, 0 4px 28px color-mix(in srgb, ${node.color} 22%, transparent), 0 0 0 6px color-mix(in srgb, ${node.color} 8%, transparent)`,
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: node.color }}
        />
        <span className="text-[16px] font-semibold tracking-[0.14em] uppercase text-text-primary leading-tight">
          {node.title}
        </span>
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: node.color }}
        />
      </div>
    );
  }

  if (node.kind === "category") {
    return (
      <button
        onPointerDown={(e) => onCategoryPointerDown(e, node.pathId)}
        className={`group relative w-full h-full flex items-center gap-2.5 px-3.5 rounded-lg select-none transition-all ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          backgroundColor: `color-mix(in srgb, ${node.color} ${isDragging ? 32 : 22}%, transparent)`,
          boxShadow: isDragging
            ? `inset 0 0 0 2px ${node.color}, 0 8px 24px color-mix(in srgb, ${node.color} 30%, transparent), 0 0 0 4px color-mix(in srgb, ${node.color} 15%, transparent)`
            : `inset 0 0 0 1.5px ${node.color}, 0 2px 12px color-mix(in srgb, ${node.color} 18%, transparent)`,
        }}
        aria-label={`Drag ${node.title} path`}
      >
        <DragHandleIcon color={node.color} />
        <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-primary leading-tight line-clamp-2 flex-1 text-left">
          {node.title}
        </span>
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
      disabled={isPhantom}
      className={`group relative w-full h-full flex items-center gap-2 px-3 text-left rounded-lg transition-all ${
        isPhantom
          ? "cursor-not-allowed opacity-45"
          : "cursor-pointer hover:brightness-125"
      }`}
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--text-primary) 7%, transparent)",
        boxShadow: isSelected
          ? `inset 0 0 0 1.5px ${node.color}, 0 0 0 3px color-mix(in srgb, ${node.color} 22%, transparent)`
          : "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 12%, transparent)",
      }}
      aria-label={isPhantom ? `${title} (not yet written)` : `Open ${title}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          backgroundColor: isPhantom ? "transparent" : real?.color ?? node.color,
          border: isPhantom
            ? `1px dashed color-mix(in srgb, var(--text-primary) 40%, transparent)`
            : "none",
        }}
      />
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

function DragHandleIcon({ color }: { color: string }) {
  return (
    <svg
      width="10"
      height="14"
      viewBox="0 0 10 14"
      fill="none"
      className="shrink-0"
      style={{ color }}
      aria-hidden="true"
    >
      <circle cx="2" cy="2" r="1" fill="currentColor" />
      <circle cx="8" cy="2" r="1" fill="currentColor" />
      <circle cx="2" cy="7" r="1" fill="currentColor" />
      <circle cx="8" cy="7" r="1" fill="currentColor" />
      <circle cx="2" cy="12" r="1" fill="currentColor" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
    </svg>
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
      panState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: transform.x,
        originY: transform.y,
        pointerId: e.pointerId,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [transform.x, transform.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!panState.current.active) return;
      setTransform((t) => ({
        ...t,
        x: panState.current.originX + (e.clientX - panState.current.startX),
        y: panState.current.originY + (e.clientY - panState.current.startY),
      }));
    },
    [setTransform]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!panState.current.active) return;
    panState.current.active = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(
        panState.current.pointerId
      );
    } catch {}
  }, []);

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
    <div className="absolute bottom-6 right-6 flex items-center gap-1.5 pointer-events-auto">
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

interface MobileListProps {
  path: ReadingPath;
  color: string;
  byId: Map<string, GraphNode>;
  selectedNodeId: string | null;
  onNodeClick: (id: string) => void;
}

function MobileList({
  path,
  color,
  byId,
  selectedNodeId,
  onNodeClick,
}: MobileListProps) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <h2 className="text-[12px] font-medium tracking-[0.12em] uppercase text-text-secondary">
            {path.title}
          </h2>
        </div>
        <p className="text-[11px] text-text-muted/80 leading-relaxed pl-4 max-w-2xl">
          {path.description}
        </p>
      </header>
      <div className="relative pl-4">
        <div
          className="absolute left-[7px] top-3 bottom-3 w-px"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 40%, transparent)`,
          }}
        />
        <div className="flex flex-col gap-1.5">
          {path.nodes.map((pn, idx) => {
            const real = byId.get(pn.id);
            const isSelected = selectedNodeId === pn.id;
            const isPhantom = !real;
            return (
              <button
                key={pn.id}
                onClick={() => !isPhantom && onNodeClick(pn.id)}
                disabled={isPhantom}
                className={`relative flex items-start gap-3 p-2.5 pr-3 text-left rounded-lg transition-all ${
                  isPhantom ? "cursor-not-allowed opacity-45" : "cursor-pointer"
                }`}
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--text-primary) 5%, transparent)",
                  boxShadow: isSelected
                    ? `inset 0 0 0 1.5px ${color}`
                    : "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 8%, transparent)",
                }}
              >
                <span
                  className="absolute -left-[11px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full border-2"
                  style={{
                    backgroundColor: "var(--graph-bg, #262626)",
                    borderColor: isPhantom
                      ? `color-mix(in srgb, var(--text-primary) 30%, transparent)`
                      : real?.color ?? color,
                  }}
                />
                <span className="text-[9px] text-text-muted/60 tabular-nums shrink-0 font-medium pt-[1px]">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-[12px] leading-tight ${
                    isSelected ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {real?.title ?? pn.id}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
