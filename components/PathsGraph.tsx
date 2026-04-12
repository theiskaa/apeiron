"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GraphData } from "@/lib/types";
import { READING_PATHS, type ReadingPath } from "@/lib/paths";
import {
  applyInterCollisions,
  buildMegaLayout,
  computeBase,
  initSims,
  stepSim,
  type PathSim,
  type PointXY,
} from "@/lib/paths-sim";
import CanvasViewport from "./paths/CanvasViewport";
import MegaDiagram from "./paths/MegaDiagram";

interface Props {
  graphData: GraphData;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  focusNodeId: string | null;
  // Filter which reading paths participate in this instance. Defaults to
  // the full READING_PATHS set used by the main view.
  paths?: ReadingPath[];
  // If set, the viewport centers + zooms on this node at mount instead of
  // running the default fit-content logic.
  initialFocusNodeId?: string | null;
  // Hide the bottom-right Focus/Reset/zoom controls.
  hideControls?: boolean;
  // Persist path offsets to localStorage. Default true; set false for
  // secondary instances like MiniPathDiagram.
  persist?: boolean;
  // Stop running the rAF physics loop. Used by PageClient when the user
  // navigates away from the graph view — the component stays mounted but
  // the sim doesn't burn CPU in the background.
  paused?: boolean;
  // Forwarded to CanvasViewport. See its docs.
  clampTransform?: boolean;
}

const OFFSETS_STORAGE_KEY = "apeirron-path-offsets";

export default function PathsGraph({
  graphData,
  onNodeClick,
  selectedNodeId,
  paths,
  initialFocusNodeId,
  hideControls,
  persist = true,
  paused = false,
  clampTransform,
}: Props) {
  // Viewport-width tracking so the grid layout can wrap paths responsively.
  // Start at 0 to signal "unmeasured"; we render nothing until the real
  // width arrives via useLayoutEffect (which runs before paint, so the
  // first visible frame already has the correct column count and focus).
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setViewportWidth((prev) =>
          Math.abs(prev - rect.width) < 1 ? prev : rect.width
        );
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute the base layout for this instance's paths. Recomputes when the
  // caller passes a different `paths` array OR when the viewport width
  // crosses a wrap threshold.
  const base = useMemo(
    () => computeBase(paths ?? READING_PATHS, viewportWidth),
    [paths, viewportWidth]
  );

  const byId = useMemo(
    () => new Map(graphData.nodes.map((n) => [n.id, n])),
    [graphData.nodes]
  );

  const simsRef = useRef<Map<string, PathSim> | null>(null);
  const baseRef = useRef(base);
  // Re-init sims whenever the base layout changes (viewport resize across
  // wrap threshold, or paths array changes). Preserve any in-progress drag
  // offsets where the path still exists.
  if (simsRef.current === null || baseRef.current !== base) {
    const prevOffsets = new Map<string, PointXY>();
    if (simsRef.current) {
      for (const [id, sim] of simsRef.current) {
        if (sim.committedOffset.x !== 0 || sim.committedOffset.y !== 0) {
          prevOffsets.set(id, { ...sim.committedOffset });
        }
      }
    }
    const fresh = initSims(base);
    for (const [id, off] of prevOffsets) {
      const sim = fresh.get(id);
      if (!sim) continue;
      sim.committedOffset = { ...off };
      sim.liveOffset = { ...off };
      for (const n of sim.nodes.values()) {
        n.x = n.bx + off.x;
        n.y = n.by + off.y;
      }
    }
    simsRef.current = fresh;
    baseRef.current = base;
  }

  const [tick, setTick] = useState(0);
  const [draggingPathId, setDraggingPathId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);

  // Set true once a pointerdown has crossed the drag threshold. Read by the
  // click wrapper so that releasing after a drag doesn't also fire onClick.
  const dragOccurredRef = useRef(false);

  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  // Live `paused` value readable from inside the rAF loop without retriggering
  // ensureRunning's identity. Lets us bail mid-coast the moment paused flips.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const ensureRunning = useCallback(() => {
    if (pausedRef.current) return;
    if (runningRef.current) return;
    runningRef.current = true;
    const loop = () => {
      // Mid-coast pause check: bail without scheduling another frame.
      if (pausedRef.current) {
        runningRef.current = false;
        rafRef.current = null;
        return;
      }
      const sims = simsRef.current;
      let anyHot = false;
      if (sims) {
        // Collisions can wake cold sims — run first so stepSim then integrates them.
        applyInterCollisions(sims);
        for (const sim of sims.values()) {
          if (sim.hot && stepSim(sim)) anyHot = true;
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
  }, []);

  // Pause transitions: cancel in-flight rAF when paused goes true; resume the
  // loop when paused goes false if any sim is still hot from before.
  useEffect(() => {
    if (paused) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      runningRef.current = false;
      return;
    }
    const sims = simsRef.current;
    if (!sims) return;
    for (const sim of sims.values()) {
      if (sim.hot) {
        ensureRunning();
        return;
      }
    }
  }, [paused, ensureRunning]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    if (!persist) return;
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
      setTick((t) => t + 1);
    } catch {}
  }, [persist]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      runningRef.current = false;
    };
  }, []);

  const persistOffsets = useCallback(() => {
    if (!persist) return;
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
  }, [persist]);

  const megaLayout = useMemo(
    () => buildMegaLayout(simsRef.current!, base),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, base]
  );

  // Content-space height that the default focus should fit into vertically.
  // If there are 3+ rows, we aim to show rows 1 and 2 fully plus ~30% of
  // row 3 as a "there's more below" hint. Otherwise, null → fit everything.
  const focusHeight = useMemo(() => {
    if (base.rowTops.length < 3) return null;
    const row3Top = base.rowTops[2];
    const peek = base.rowHeights[2] * 0.3;
    return row3Top + peek;
  }, [base]);

  // Compute the initial focus point from the layout if an initialFocusNodeId
  // is provided. Tri-state so CanvasViewport can distinguish "no focus
  // requested" (null → use default fit) from "focus requested but data
  // not ready yet" (undefined → wait) from "ready" ({x,y} → center on it).
  const initialFocusPoint = useMemo<
    { x: number; y: number } | null | undefined
  >(() => {
    if (!initialFocusNodeId) return null;
    for (const g of megaLayout.pathGroups) {
      for (const n of g.nodes) {
        if (n.nodeId === initialFocusNodeId) {
          return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
        }
      }
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFocusNodeId, megaLayout]);

  const hasDrags = useMemo(() => {
    const sims = simsRef.current;
    if (!sims) return false;
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

  const handleResetLayout = useCallback(() => {
    const sims = simsRef.current;
    if (!sims) return;
    for (const sim of sims.values()) {
      sim.committedOffset = { x: 0, y: 0 };
      sim.liveOffset = { x: 0, y: 0 };
      sim.hot = true;
    }
    persistOffsets();
    ensureRunning();
  }, [ensureRunning, persistOffsets]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: "var(--graph-bg, #262626)" }}
    >
      {viewportWidth > 0 && (
      <div className="absolute inset-0">
        <CanvasViewport
          transform={transform}
          setTransform={setTransform}
          contentWidth={megaLayout.width}
          contentHeight={megaLayout.height}
          onResetLayout={handleResetLayout}
          hasDrags={hasDrags}
          initialFocusPoint={initialFocusPoint}
          focusHeight={focusHeight}
          hideControls={hideControls}
          clampTransform={clampTransform}
        >
          <MegaDiagram
            layout={megaLayout}
            byId={byId}
            selectedNodeId={selectedNodeId}
            draggingPathId={draggingPathId}
            onNodeClick={handleNodeClick}
            onNodePointerDown={handleNodePointerDown}
          />
        </CanvasViewport>
      </div>
      )}
    </div>
  );
}
