"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { GraphNode } from "@/lib/types";

interface Props {
  nodes: GraphNode[];
  open: boolean;
  onClose: () => void;
  onSelect: (nodeId: string) => void;
}

export default function CommandPalette({ nodes, open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return nodes;
    const q = query.toLowerCase();
    return nodes
      .map((node) => {
        const title = node.title.toLowerCase();
        let score = 0;
        if (title.startsWith(q)) score = 3;
        else if (title.includes(q)) score = 2;
        else if (node.category.toLowerCase().includes(q)) score = 1;
        return { node, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.node.title.localeCompare(b.node.title))
      .map((r) => r.node);
  }, [nodes, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (nodeId: string) => {
      onSelect(nodeId);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) {
            handleSelect(filtered[selectedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, handleSelect, onClose]
  );

  if (!open) return null;

  const hasResults = query.trim().length > 0 && filtered.length > 0;
  const hasNoResults = query.trim().length > 0 && filtered.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md" onClick={onClose} />

      <div
        className="relative w-full max-w-xl mx-4"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-5 h-12 bg-[var(--surface)] rounded-full shadow-2xl shadow-black/10 dark:shadow-black/30 ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
          <svg
            width="16"
            height="16"
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
            placeholder="Search nodes..."
            className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>

        {(hasResults || hasNoResults) && (
          <div className="mt-2 bg-[var(--surface)] rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 ring-1 ring-black/[0.06] dark:ring-white/[0.08] overflow-hidden">
            {hasNoResults ? (
              <div className="px-5 py-6 text-center text-sm text-text-muted">
                No matching nodes
              </div>
            ) : (
              <div ref={listRef} className="max-h-72 overflow-y-auto py-1.5 px-1.5 no-scrollbar">
                {filtered.map((node, i) => (
                  <button
                    key={node.id}
                    onClick={() => handleSelect(node.id)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors rounded-xl ${
                      i === selectedIndex ? "bg-black/[0.04] dark:bg-white/[0.06]" : ""
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="text-[14px] text-text-primary truncate">
                      {node.title}
                    </span>
                    <span className="ml-auto text-[11px] text-text-muted shrink-0">
                      {node.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
