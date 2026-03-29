"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import type { GraphData } from "@/lib/types";
import Navbar from "./Navbar";
import TabBar, { type Tab } from "./TabBar";
import NodeView from "./NodeView";

const Graph = dynamic(() => import("./Graph"), { ssr: false });

const GRAPH_TAB: Tab = { id: "graph", type: "graph" };

interface Props {
  graphData: GraphData;
  initialNodeId?: string;
}

export default function PageClient({ graphData, initialNodeId }: Props) {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    if (initialNodeId) {
      return [GRAPH_TAB, { id: `node:${initialNodeId}`, type: "node", nodeId: initialNodeId }];
    }
    return [GRAPH_TAB];
  });
  const [activeTabId, setActiveTabId] = useState(
    initialNodeId ? `node:${initialNodeId}` : "graph"
  );

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? GRAPH_TAB,
    [tabs, activeTabId]
  );

  const activeNode = useMemo(() => {
    if (activeTab.type !== "node" || !activeTab.nodeId) return null;
    return graphData.nodes.find((n) => n.id === activeTab.nodeId) ?? null;
  }, [activeTab, graphData.nodes]);

  const hasNodeTabs = tabs.some((t) => t.type === "node");

  useEffect(() => {
    if (activeTab.type === "node" && activeTab.nodeId) {
      window.history.replaceState(null, "", `/node/${activeTab.nodeId}`);
    } else {
      window.history.replaceState(null, "", "/");
    }
  }, [activeTab]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const tabId = `node:${nodeId}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: "node", nodeId }];
    });
    setActiveTabId(tabId);
  }, []);

  const handleSelectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      setActiveTabId((current) => {
        if (current !== tabId) return current;
        if (idx > 0 && next[idx - 1]) return next[idx - 1].id;
        return "graph";
      });
      return next;
    });
  }, []);

  const selectedNodeOnGraph = useMemo(() => {
    if (activeTab.type === "node") return activeTab.nodeId ?? null;
    return null;
  }, [activeTab]);

  const showGraph = activeTab.type === "graph";

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div className={`absolute inset-0 ${showGraph ? "z-0" : "z-[-1] pointer-events-none"}`}>
        <Graph
          graphData={graphData}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNodeOnGraph}
        />
      </div>

      {activeNode && !showGraph && (
        <div className="absolute inset-0 bg-background overflow-hidden">
          <div className="flex flex-col h-full">
            <Navbar onLogoClick={() => setActiveTabId("graph")} />
            {hasNodeTabs && (
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                nodes={graphData.nodes}
                onSelectTab={handleSelectTab}
                onCloseTab={handleCloseTab}
              />
            )}
            <div className="flex-1 overflow-hidden">
              <NodeView
                node={activeNode}
                links={graphData.links}
                allNodes={graphData.nodes}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>
        </div>
      )}

      {showGraph && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <Navbar onLogoClick={() => setActiveTabId("graph")} />
          {hasNodeTabs && (
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              nodes={graphData.nodes}
              onSelectTab={handleSelectTab}
              onCloseTab={handleCloseTab}
            />
          )}
        </div>
      )}
    </div>
  );
}
