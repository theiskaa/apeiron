"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
interface CanvasViewportProps {
  transform: { x: number; y: number; scale: number };
  setTransform: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; scale: number }>
  >;
  contentWidth: number;
  contentHeight: number;
  onResetLayout: () => void;
  hasDrags: boolean;
  // If set, the viewport centers + zooms on this content-space point at
  // mount instead of running the default fit-content logic.
  //   - {x,y}  → focus on this point
  //   - null   → no focus requested, use default fit
  //   - undefined → focus requested but data not ready yet, wait before
  //     initializing (prevents a flash of "default fit" before the real
  //     focus point arrives when the viewport is still being measured)
  initialFocusPoint?: { x: number; y: number } | null;
  // Optional target content-space height for default focus. When set, the
  // scale is picked so this height fits in the viewport (instead of the
  // full contentHeight). Used to show only the first ~2 rows of the grid
  // with a peek of the 3rd, rather than zooming all the way out to fit
  // every row.
  focusHeight?: number | null;
  hideControls?: boolean;
  // When true, keep the content's center inside the viewport after every
  // transform update. Prevents pan / fling / wheel from launching content
  // completely off-screen in constrained contexts (e.g. the 360 px mini
  // where the user has no Fit button to recover).
  clampTransform?: boolean;
  children: React.ReactNode;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 3;
const INITIAL_FOCUS_SCALE = 0.8;

export default function CanvasViewport({
  transform,
  setTransform,
  contentWidth,
  contentHeight,
  onResetLayout,
  hasDrags,
  initialFocusPoint,
  focusHeight,
  hideControls,
  clampTransform,
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

  // Clamp a candidate transform so the content's center stays inside the
  // viewport rect. Applied to every setTransform call when clampTransform
  // is enabled — catches wheel, pan, fling coast, zoom buttons alike.
  const applyClamp = useCallback(
    (t: { x: number; y: number; scale: number }) => {
      if (!clampTransform) return t;
      const el = viewportRef.current;
      if (!el) return t;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return t;
      const centerX = t.x + (contentWidth * t.scale) / 2;
      const centerY = t.y + (contentHeight * t.scale) / 2;
      let nx = t.x;
      let ny = t.y;
      if (centerX < 0) nx -= centerX;
      else if (centerX > rect.width) nx -= centerX - rect.width;
      if (centerY < 0) ny -= centerY;
      else if (centerY > rect.height) ny -= centerY - rect.height;
      return { ...t, x: nx, y: ny };
    },
    [clampTransform, contentWidth, contentHeight]
  );

  // Wrapped setter that runs every update through applyClamp. All internal
  // transform mutations go through this instead of the raw `setTransform`
  // prop so constrained contexts (the mini) can't escape their bounds.
  const setClampedTransform: typeof setTransform = useCallback(
    (updater) => {
      setTransform((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (
                p: { x: number; y: number; scale: number }
              ) => { x: number; y: number; scale: number })(prev)
            : updater;
        return applyClamp(next);
      });
    },
    [setTransform, applyClamp]
  );

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
    setClampedTransform({
      x: (rect.width - contentWidth * fit) / 2,
      y: (rect.height - contentHeight * fit) / 2,
      scale: fit,
    });
  }, [contentWidth, contentHeight, setClampedTransform]);

  // Default focus: scale so the content width fits with breathing room AND
  // `focusHeight` (typically 2 rows + peek of the 3rd) fits vertically.
  // Top-align so Genesis and its row-mates sit at the top of the viewport
  // and the user pans/scrolls down for subsequent rows. Capped at 1× to
  // avoid ballooning densely-packed cards.
  const focusContent = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const widthFit = (rect.width - 120) / contentWidth;
    const targetH = focusHeight && focusHeight > 0 ? focusHeight : contentHeight;
    const heightFit = (rect.height - 80) / targetH;
    const scale = Math.max(MIN_SCALE, Math.min(1, widthFit, heightFit));
    setClampedTransform({
      x: (rect.width - contentWidth * scale) / 2,
      y: 32,
      scale,
    });
  }, [contentWidth, contentHeight, focusHeight, setClampedTransform]);

  useLayoutEffect(() => {
    if (initialized) return;
    // Tri-state on initialFocusPoint: undefined means "waiting for the
    // focus point to be computed" (data not ready yet) — we must not fall
    // back to focusContent() yet, or we'll lock in a center-fit view
    // before the real focus target arrives.
    if (initialFocusPoint === undefined) return;
    if (initialFocusPoint) {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const scale = INITIAL_FOCUS_SCALE;
      // Use the raw setTransform (not setClampedTransform) so applyClamp
      // doesn't force the content's center back into the viewport — when
      // the target node is near the top/bottom of a tall path and the
      // content is taller than the viewport, clamping would pull the
      // view back toward the content's center, defeating the focus.
      setTransform({
        x: rect.width / 2 - initialFocusPoint.x * scale,
        y: rect.height / 2 - initialFocusPoint.y * scale,
        scale,
      });
      setInitialized(true);
      return;
    }
    focusContent();
    setInitialized(true);
  }, [focusContent, initialized, initialFocusPoint, setTransform, setClampedTransform]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      // Wheel always zooms — matches the connections Graph component and
      // the Figma/Excalidraw convention. Pinch (which browsers report as
      // wheel + ctrlKey on macOS) and Ctrl/Cmd+wheel are also handled by
      // this same path. To pan, the user drags.
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setClampedTransform((t) => {
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
  }, [setClampedTransform]);

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
      setClampedTransform((t) => ({
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
    [setClampedTransform]
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
        setClampedTransform((t) => ({ ...t, x: t.x + vx, y: t.y + vy }));
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
    [setClampedTransform, stopPanInertia]
  );

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      setClampedTransform((t) => {
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
    [setClampedTransform]
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

      {!hideControls && (
        <ViewControls
          scale={transform.scale}
          onZoomIn={() => zoomAtCenter(1.2)}
          onZoomOut={() => zoomAtCenter(1 / 1.2)}
          onFit={fitToView}
          onFocus={focusContent}
          onResetLayout={onResetLayout}
          hasDrags={hasDrags}
        />
      )}
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
        aria-label="Focus content"
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
