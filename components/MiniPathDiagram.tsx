"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { GraphNode } from "@/lib/types";
import { READING_PATHS } from "@/lib/paths";

// Load PathsGraph dynamically with SSR off — it touches window in its rAF
// loop and reads localStorage for persistence (which we disable here).
const PathsGraph = dynamic(() => import("./PathsGraph"), { ssr: false });

interface Props {
  currentNodeId: string;
  allNodes: GraphNode[];
  onNodeClick: (nodeId: string) => void;
}

export default function MiniPathDiagram({
  currentNodeId,
  allNodes,
  onNodeClick,
}: Props) {
  // Find the first reading path that contains the current node. If the
  // user navigates into a different path later, `key={path.id}` below
  // forces a fresh PathsGraph instance so the sim re-inits cleanly.
  const path = useMemo(
    () =>
      READING_PATHS.find((p) =>
        p.nodes.some((n) => n.id === currentNodeId)
      ) ?? null,
    [currentNodeId]
  );

  // PathsGraph expects a GraphData. It only reads nodes (for titles/colors
  // via byId); links aren't used by the paths sim, so an empty list is fine.
  const graphData = useMemo(
    () => ({ nodes: allNodes, links: [] }),
    [allNodes]
  );

  // Stable single-path array reference so PathsGraph's `base` useMemo
  // doesn't thrash. Keyed on path identity.
  const pathsProp = useMemo(
    () => (path ? [path] : []),
    [path]
  );

  if (!path) {
    return (
      <div
        className="w-full rounded-lg overflow-hidden border border-border flex items-center justify-center text-[11px] text-text-muted text-center px-6"
        style={{ height: 360 }}
      >
        This node isn&apos;t part of any reading path yet.
      </div>
    );
  }

  // PathsGraph's root is `absolute inset-0`, so the parent needs to be
  // relative + sized. This gives it the fixed mini chrome (rounded,
  // bordered, height 360) and lets it fill the frame edge-to-edge.
  return (
    <div
      className="w-full rounded-lg overflow-hidden border border-border relative"
      style={{ height: 360 }}
    >
      <PathsGraph
        key={path.id}
        graphData={graphData}
        onNodeClick={onNodeClick}
        selectedNodeId={currentNodeId}
        focusNodeId={null}
        paths={pathsProp}
        initialFocusNodeId={currentNodeId}
        hideControls
        hideApeirron
        persist={false}
      />
    </div>
  );
}
