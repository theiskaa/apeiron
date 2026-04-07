"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { GraphNode } from "@/lib/types";
import { READING_PATHS } from "@/lib/paths";

type Mode = "browse" | "paths";

export const EXPLORER_MIN_WIDTH = 272;
export const EXPLORER_MAX_WIDTH = 600;
export const EXPLORER_DEFAULT_WIDTH = 480;
export const EXPLORER_WIDTH_KEY = "apeiron-explorer-width";
export const EXPLORER_OPEN_KEY = "apeiron-explorer-open";

export function loadExplorerWidth(): number {
  if (typeof window === "undefined") return EXPLORER_DEFAULT_WIDTH;
  try {
    const v = localStorage.getItem(EXPLORER_WIDTH_KEY);
    if (v) {
      const n = Number(v);
      if (n >= EXPLORER_MIN_WIDTH && n <= EXPLORER_MAX_WIDTH) return n;
    }
  } catch {}
  return EXPLORER_DEFAULT_WIDTH;
}

export function loadExplorerOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(EXPLORER_OPEN_KEY) === "true";
  } catch {}
  return false;
}

interface Props {
  nodes: GraphNode[];
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
}

export default function ExplorerPanel({
  nodes,
  onClose,
  onNodeSelect,
}: Props) {
  const [mode, setMode] = useState<Mode>("paths");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "browse")
      setTimeout(() => inputRef.current?.focus(), 100);
  }, [mode]);

  const realNodes = useMemo(() => nodes.filter((n) => !n.phantom), [nodes]);
  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const categories = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? realNodes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.category.toLowerCase().includes(q)
        )
      : realNodes;

    const map = new Map<
      string,
      { id: string; label: string; color: string; nodes: GraphNode[] }
    >();
    for (const node of filtered) {
      if (!map.has(node.category)) {
        map.set(node.category, {
          id: node.category,
          label: node.category
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          color: node.color,
          nodes: [],
        });
      }
      map.get(node.category)!.nodes.push(node);
    }
    for (const group of map.values()) {
      group.nodes.sort(
        (a, b) => b.val - a.val || a.title.localeCompare(b.title)
      );
    }
    return Array.from(map.values()).sort(
      (a, b) => b.nodes.length - a.nodes.length
    );
  }, [realNodes, query]);

  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (nodeId: string) => onNodeSelect(nodeId),
    [onNodeSelect]
  );

  return (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundColor: "var(--surface)",
      }}
    >
        <div className="flex items-center justify-between px-3 md:px-5 pt-10 md:pt-7 pb-4 shrink-0">
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-full"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--text-primary) 5%, transparent)",
              boxShadow:
                "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 10%, transparent)",
            }}
          >
            <button
              onClick={() => setMode("paths")}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium tracking-wide transition-all duration-150 leading-none ${
                mode === "paths"
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              style={
                mode === "paths"
                  ? {
                      backgroundColor: "var(--surface)",
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px color-mix(in srgb, var(--text-primary) 8%, transparent)",
                    }
                  : undefined
              }
            >
              Paths
            </button>
            <button
              onClick={() => setMode("browse")}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium tracking-wide transition-all duration-150 leading-none ${
                mode === "browse"
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
              style={
                mode === "browse"
                  ? {
                      backgroundColor: "var(--surface)",
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px color-mix(in srgb, var(--text-primary) 8%, transparent)",
                    }
                  : undefined
              }
            >
              Browse
            </button>
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-text-muted hover:text-text-secondary transition-all text-[11px] tracking-wide leading-none"
            style={{
              backgroundColor: "color-mix(in srgb, var(--text-primary) 5%, transparent)",
              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 10%, transparent)",
            }}
            aria-label="Close explorer"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {mode === "browse" && (
          <div className="pl-3 pr-2 pb-2 shrink-0">
            <div
              className="flex items-center gap-2 px-3 h-8 rounded-lg transition-shadow"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--text-primary) 4%, transparent)",
                boxShadow:
                  "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 8%, transparent)",
              }}
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
                className="text-text-muted shrink-0"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter nodes…"
                className="flex-1 bg-transparent text-[12px] text-text-primary placeholder:text-text-muted outline-none focus:outline-none focus:ring-0"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                  aria-label="Clear filter"
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto panel-scroll pl-1.5 pr-1 pb-3">
          {mode === "paths" ? (
            <div>
              {READING_PATHS.map((path) => {
                const isCollapsed = collapsed.has(path.id);
                const pathNodes = path.nodes
                  .map((pn) => ({ ...pn, node: nodeMap.get(pn.id) }))
                  .filter((pn) => pn.node);

                return (
                  <div key={path.id} className="mb-1">
                    <button
                      onClick={() => toggleSection(path.id)}
                      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] transition-colors group"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-text-muted/60 shrink-0 mt-[3px] transition-transform duration-150"
                        style={{
                          transform: isCollapsed
                            ? "rotate(-90deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-medium text-text-primary">
                            {path.title}
                          </span>
                          <span className="text-[9px] text-text-muted/40 tabular-nums ml-auto shrink-0">
                            {pathNodes.length}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted/70 mt-0.5 leading-snug">
                          {path.description}
                        </p>
                      </div>
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-200"
                      style={{
                        maxHeight: isCollapsed
                          ? "0px"
                          : `${pathNodes.length * 52 + 8}px`,
                        opacity: isCollapsed ? 0 : 1,
                      }}
                    >
                      <div className="ml-[22px] relative py-1">
                        <div
                          className="absolute left-[7px] top-4 bottom-4 w-px"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--text-primary) 8%, transparent)",
                          }}
                        />

                        {pathNodes.map((pn, i) => (
                          <button
                            key={pn.id}
                            onClick={() => handleSelect(pn.id)}
                            className="w-full flex items-start gap-3 pl-1 pr-2.5 py-[5px] rounded-lg text-left hover:bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)] transition-colors group relative"
                          >
                            <span
                              className="w-[9px] h-[9px] rounded-full shrink-0 mt-[3px] relative z-[1] border-2 group-hover:scale-110 transition-transform"
                              style={{
                                backgroundColor: "var(--surface)",
                                borderColor:
                                  pn.node?.color ?? "var(--text-muted)",
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-text-muted/40 tabular-nums shrink-0 w-3 text-right">
                                  {i + 1}
                                </span>
                                <span className="text-[12px] text-text-secondary group-hover:text-text-primary transition-colors truncate">
                                  {pn.node?.title ?? pn.id}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-muted/50 group-hover:text-text-muted/80 transition-colors truncate mt-px ml-[18px]">
                                {pn.hook}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {categories.map((cat) => {
                const isCollapsed = collapsed.has(cat.id);
                return (
                  <div key={cat.id} className="mb-0.5">
                    <button
                      onClick={() => toggleSection(cat.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-left hover:bg-[color-mix(in_srgb,var(--text-primary)_4%,transparent)] transition-colors group"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-text-muted/60 shrink-0 transition-transform duration-150"
                        style={{
                          transform: isCollapsed
                            ? "rotate(-90deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <span
                        className="w-[7px] h-[7px] rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-[11px] font-medium text-text-secondary tracking-wide flex-1">
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-text-muted/50 tabular-nums">
                        {cat.nodes.length}
                      </span>
                    </button>

                    <div
                      className="overflow-hidden transition-all duration-150"
                      style={{
                        maxHeight: isCollapsed
                          ? "0px"
                          : `${cat.nodes.length * 36}px`,
                        opacity: isCollapsed ? 0 : 1,
                      }}
                    >
                      <div className="ml-[18px]">
                        {cat.nodes.map((node) => (
                          <button
                            key={node.id}
                            onClick={() => handleSelect(node.id)}
                            className="w-full flex items-center gap-2.5 px-2.5 py-[6px] rounded-lg text-left hover:bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)] transition-colors group"
                          >
                            <span
                              className="w-[5px] h-[5px] rounded-full shrink-0 opacity-40 group-hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: node.color }}
                            />
                            <span className="text-[12px] text-text-secondary group-hover:text-text-primary transition-colors truncate flex-1">
                              {node.title}
                            </span>
                            <span className="text-[9px] text-text-muted/40 tabular-nums shrink-0 group-hover:text-text-muted/70 transition-colors">
                              {node.val}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {categories.length === 0 && query && (
                <div className="px-3 py-8 text-center text-[12px] text-text-muted">
                  No matching nodes
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="pl-4 pr-3 py-2.5 shrink-0 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="text-[10px] text-text-muted/60">
            {mode === "paths"
              ? `${READING_PATHS.length} paths`
              : `${realNodes.length} nodes`}
          </span>
          <kbd className="text-[9px] text-text-muted/40 tracking-wide">⌘B</kbd>
        </div>
    </div>
  );
}
