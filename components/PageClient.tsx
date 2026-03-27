"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { GraphData, Category } from "@/lib/types";
import NodePanel from "./NodePanel";

const Graph = dynamic(() => import("./Graph"), { ssr: false });

interface Props {
  graphData: GraphData;
  categories: Category[];
}

export default function PageClient({ graphData, categories }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graphData, selectedNodeId]
  );

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => {
      if (prev && prev !== nodeId) {
        setHistory((h) => [...h, prev]);
      }
      return nodeId;
    });
  }, []);

  const handleBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const lastId = newHistory.pop()!;
      setSelectedNodeId(lastId);
      return newHistory;
    });
  }, []);

  const handleClose = useCallback(() => {
    setSelectedNodeId(null);
    setHistory([]);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      <Graph
        graphData={graphData}
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedNodeId}
      />

      <NodePanel
        node={selectedNode}
        links={graphData.links}
        allNodes={graphData.nodes}
        categories={categories}
        onClose={handleClose}
        onNodeClick={handleNodeClick}
        onBack={handleBack}
        canGoBack={history.length > 0}
      />
    </div>
  );
}
