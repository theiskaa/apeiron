"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { GraphData } from "@/lib/types";
import Navbar from "./Navbar";
import TabBar, { type Tab } from "./TabBar";
import NodeView from "./NodeView";
import CommandPalette from "./CommandPalette";
import ExplorerPanel, {
  loadExplorerWidth,
  loadExplorerOpen,
  EXPLORER_OPEN_KEY,
  EXPLORER_WIDTH_KEY,
  EXPLORER_MIN_WIDTH,
  EXPLORER_MAX_WIDTH,
} from "./ExplorerPanel";

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(() => loadExplorerOpen());
  const [explorerWidth, setExplorerWidth] = useState(() => loadExplorerWidth());
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startWidth: 0 });
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  const setExplorerOpenPersist = useCallback((open: boolean | ((v: boolean) => boolean)) => {
    setExplorerOpen((prev) => {
      const next = typeof open === "function" ? open(prev) : open;
      try { localStorage.setItem(EXPLORER_OPEN_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const setExplorerWidthPersist = useCallback((w: number) => {
    setExplorerWidth(w);
    try { localStorage.setItem(EXPLORER_WIDTH_KEY, String(w)); } catch {}
  }, []);

  // Resize drag
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: explorerWidth };
      setIsDragging(true);
    },
    [explorerWidth]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      const delta = e.clientX - dragRef.current.startX;
      const next = Math.min(EXPLORER_MAX_WIDTH, Math.max(EXPLORER_MIN_WIDTH, dragRef.current.startWidth + delta));
      setExplorerWidth(next);
    };
    const handleUp = () => {
      setIsDragging(false);
      setExplorerWidth((w) => {
        try { localStorage.setItem(EXPLORER_WIDTH_KEY, String(w)); } catch {}
        return w;
      });
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging]);

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
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setExplorerOpenPersist((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setExplorerOpenPersist]);

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
  const toggleExplorer = useCallback(
    () => setExplorerOpenPersist((v) => !v),
    [setExplorerOpenPersist]
  );
  const closeExplorer = useCallback(
    () => setExplorerOpenPersist(false),
    [setExplorerOpenPersist]
  );

  const mainContent = (
    <div className="relative w-full h-full overflow-hidden">
      <div className={`absolute inset-0 ${showGraph ? "z-0" : "z-[-1] pointer-events-none"}`}>
        <Graph
          graphData={graphData}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNodeOnGraph}
          focusNodeId={focusNodeId}
        />
      </div>

      {activeNode && !showGraph && (
        <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
          <div className="flex flex-col h-full">
            <Navbar
              onLogoClick={() => setActiveTabId("graph")}
              onSearchClick={openSearch}
              onExplorerToggle={toggleExplorer}
              explorerOpen={explorerOpen}
            />
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
          <Navbar
            onLogoClick={() => setActiveTabId("graph")}
            onSearchClick={openSearch}
            onExplorerToggle={toggleExplorer}
            explorerOpen={explorerOpen}
          />
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

      <CommandPalette
        nodes={graphData.nodes}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handlePaletteSelect}
      />
    </div>
  );

  return (
    <div
      className="flex w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: explorerOpen ? "var(--shell)" : "var(--surface)",
        padding: explorerOpen ? "12px" : "0px",
        gap: explorerOpen ? "10px" : "0px",
        transition: isDragging ? "background-color 250ms ease" : "padding 250ms ease, gap 250ms ease, background-color 250ms ease",
      }}
    >
      {/* Explorer — left split pane */}
      {explorerOpen && (
        <>
          <div
            style={{ width: `${explorerWidth}px` }}
            className="shrink-0 h-full rounded-xl overflow-hidden"
          >
            <ExplorerPanel
              nodes={graphData.nodes}
              onClose={closeExplorer}
              onNodeSelect={handleNodeClick}
            />
          </div>

          {/* Resize handle in the gap */}
          <div
            onMouseDown={handleDragStart}
            className="w-2.5 shrink-0 cursor-col-resize group relative flex items-center justify-center -mx-[3px] z-10"
          >
            <div
              className={`w-[3px] h-12 rounded-full transition-opacity duration-150 ${
                isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
              style={{
                backgroundColor: "color-mix(in srgb, var(--text-primary) 20%, transparent)",
              }}
            />
          </div>
        </>
      )}

      {/* Main — right split pane (takes remaining space) */}
      <div
        className="flex-1 min-w-0 h-full overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: explorerOpen ? "12px" : "0px",
          transition: "border-radius 250ms ease",
        }}
      >
        {mainContent}
      </div>
    </div>
  );
}
