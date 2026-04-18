"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { GraphData } from "@/lib/types";
import Navbar from "./Navbar";
import TabBar, { type Tab } from "./TabBar";
import NodeView from "./NodeView";
import CommandPalette from "./CommandPalette";
import ViewModeToggle, { type ViewMode } from "./ViewModeToggle";

const Graph = dynamic(() => import("./Graph"), { ssr: false });
const PathsGraph = dynamic(() => import("./PathsGraph"), { ssr: false });

const VIEW_MODE_STORAGE_KEY = "apeirron-view-mode";

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("connections");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === "connections" || saved === "paths") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {}
  }, []);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? GRAPH_TAB,
    [tabs, activeTabId]
  );

  const activeNode = useMemo(() => {
    if (activeTab.type !== "node" || !activeTab.nodeId) return null;
    return graphData.nodes.find((n) => n.id === activeTab.nodeId) ?? null;
  }, [activeTab, graphData.nodes]);

  const hasNodeTabs = tabs.some((t) => t.type === "node");

  const prevUrl = useRef(typeof window !== "undefined" ? window.location.pathname : "/");
  useEffect(() => {
    const url = activeTab.type === "node" && activeTab.nodeId
      ? `/node/${activeTab.nodeId}`
      : "/";
    if (url !== prevUrl.current) {
      window.history.pushState({ tabId: activeTabId }, "", url);
      prevUrl.current = url;
    }
  }, [activeTab, activeTabId]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/node\/(.+)$/);
      if (match) {
        const nodeId = match[1];
        const tabId = `node:${nodeId}`;
        setTabs((prev) => {
          if (prev.some((t) => t.id === tabId)) return prev;
          return [...prev, { id: tabId, type: "node", nodeId }];
        });
        setActiveTabId(tabId);
      } else {
        setActiveTabId("graph");
      }
      prevUrl.current = path;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const handlePaletteSelect = useCallback(
    (nodeId: string) => {
      const showGraph = activeTabId === "graph";
      if (showGraph) {
        setFocusNodeId(nodeId);
        setTimeout(() => setFocusNodeId(null), 1000);
      } else {
        handleNodeClick(nodeId);
      }
    },
    [activeTabId, handleNodeClick]
  );

  const selectedNodeOnGraph = useMemo(() => {
    if (activeTab.type === "node") return activeTab.nodeId ?? null;
    return null;
  }, [activeTab]);

  const showGraph = activeTab.type === "graph";
  const openSearch = useCallback(() => setPaletteOpen(true), []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Both graphs stay mounted; the inactive one is hidden via opacity
          (not display:none, which would zero the container width and
          re-trigger Graph's ResizeObserver / force-config effect). Each
          receives a `paused` prop so its render loop halts while hidden. */}
      <div className={`absolute inset-0 ${showGraph ? "z-0" : "z-[-1] pointer-events-none"}`}>
        <div
          className={`absolute inset-0 transition-opacity duration-150 ${
            viewMode === "connections" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <Graph
            graphData={graphData}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeOnGraph}
            focusNodeId={focusNodeId}
            paused={viewMode !== "connections" || !showGraph}
          />
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-150 ${
            viewMode === "paths" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <PathsGraph
            graphData={graphData}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeOnGraph}
            focusNodeId={focusNodeId}
            paused={viewMode !== "paths" || !showGraph}
          />
        </div>
      </div>

      {activeNode && !showGraph && (
        <div className="absolute inset-0 bg-background overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="sticky top-0 z-10 bg-background">
              <Navbar onLogoClick={() => setActiveTabId("graph")} onSearchClick={openSearch} />
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
        <div className="absolute top-0 left-0 right-0 z-10 bg-background">
          <Navbar onLogoClick={() => setActiveTabId("graph")} onSearchClick={openSearch} />
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

      {showGraph && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <ViewModeToggle mode={viewMode} onChange={handleViewModeChange} />
        </div>
      )}

      <CommandPalette
        nodes={graphData.nodes}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handlePaletteSelect}
      />
    </div>
  );
}
