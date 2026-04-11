"use client";

import {
  useCallback,
  useEffect,
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
  // running the default focusApeirron logic.
  initialFocusNodeId?: string | null;
  // Hide the bottom-right Focus/Reset/zoom controls.
  hideControls?: boolean;
  // Hide the Apeirron root card and its hub edges entirely. Used by
  // MiniPathDiagram — the single-path view doesn't need the root hub.
  hideApeirron?: boolean;
  // Persist path offsets and global offset to localStorage. Default true;
  // set false for secondary instances like MiniPathDiagram.
  persist?: boolean;
}

const OFFSETS_STORAGE_KEY = "apeirron-path-offsets";
const GLOBAL_OFFSET_STORAGE_KEY = "apeirron-global-offset";

export default function PathsGraph({
  graphData,
  onNodeClick,
  selectedNodeId,
  paths,
  initialFocusNodeId,
  hideControls,
  hideApeirron,
  persist = true,
}: Props) {
  // Compute the base layout for this instance's paths. Stable referential
  // equality on the paths array means this only recomputes when the caller
  // actually passes a different `paths`.
  const base = useMemo(
    () => computeBase(paths ?? READING_PATHS),
    [paths]
  );

  const byId = useMemo(
    () => new Map(graphData.nodes.map((n) => [n.id, n])),
    [graphData.nodes]
  );

  const simsRef = useRef<Map<string, PathSim> | null>(null);
  if (simsRef.current === null) {
    simsRef.current = initSims(base);
  }

  const [tick, setTick] = useState(0);
  const [draggingPathId, setDraggingPathId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef(transform);

  // Set true once a pointerdown has crossed the drag threshold. Read by the
  // click wrapper so that releasing after a drag doesn't also fire onClick.
  const dragOccurredRef = useRef(false);

  // Global offset — set by dragging Apeirron, shifts every path's target
  // position uniformly. Apeirron renders at base + global; paths render at
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

  const persistGlobalOffset = useCallback(() => {
    if (!persist) return;
    try {
      const g = globalOffsetRef.current;
      if (g.x === 0 && g.y === 0) {
        localStorage.removeItem(GLOBAL_OFFSET_STORAGE_KEY);
      } else {
        localStorage.setItem(GLOBAL_OFFSET_STORAGE_KEY, JSON.stringify(g));
      }
    } catch {}
  }, [persist]);

  const megaLayout = useMemo(
    () => buildMegaLayout(simsRef.current!, getEffectiveGlobalOffset(), base),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, base]
  );

  // Compute the initial focus point from the layout if an initialFocusNodeId
  // is provided. CanvasViewport uses this at mount to center + zoom on the
  // specific node instead of running its default focusApeirron logic.
  const initialFocusPoint = useMemo(() => {
    if (!initialFocusNodeId) return null;
    for (const g of megaLayout.pathGroups) {
      for (const n of g.nodes) {
        if (n.nodeId === initialFocusNodeId) {
          return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
        }
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFocusNodeId, megaLayout]);

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

  const handleApeirronPointerDown = useCallback(
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
          initialFocusPoint={initialFocusPoint}
          hideControls={hideControls}
        >
          <MegaDiagram
            layout={megaLayout}
            byId={byId}
            selectedNodeId={selectedNodeId}
            draggingPathId={draggingPathId}
            onNodeClick={handleNodeClick}
            onNodePointerDown={handleNodePointerDown}
            onApeirronPointerDown={handleApeirronPointerDown}
            hideApeirron={hideApeirron}
          />
        </CanvasViewport>
      </div>
    </div>
  );
}
