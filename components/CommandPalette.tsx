"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { GraphNode } from "@/lib/types";

export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  perform: () => void;
}

interface Props {
  nodes: GraphNode[];
  actions: CommandAction[];
  open: boolean;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

type FlatItem =
  | { kind: "action"; action: CommandAction }
  | { kind: "node"; node: GraphNode };

export default function CommandPalette({
  nodes,
  actions,
  open,
  onClose,
  onSelectNode,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => {
      if (a.label.toLowerCase().includes(q)) return true;
      return a.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
    });
  }, [actions, query]);

  const filteredNodes = useMemo(() => {
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

  const grouped = useMemo(() => {
    if (query.trim()) return null;
    const map = new Map<string, { label: string; color: string; nodes: GraphNode[] }>();
    for (const n of nodes) {
      if (!map.has(n.category)) {
        map.set(n.category, {
          label: n.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          color: n.color,
          nodes: [],
        });
      }
      map.get(n.category)!.nodes.push(n);
    }
    for (const g of map.values()) {
      g.nodes.sort((a, b) => a.title.localeCompare(b.title));
    }
    return Array.from(map.values());
  }, [nodes, query]);

  // Single flat list drives keyboard navigation across actions then nodes.
  const flatList = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = filteredActions.map((action) => ({
      kind: "action",
      action,
    }));
    if (query.trim()) {
      for (const node of filteredNodes) items.push({ kind: "node", node });
    } else if (grouped) {
      for (const g of grouped) {
        for (const node of g.nodes) items.push({ kind: "node", node });
      }
    }
    return items;
  }, [filteredActions, filteredNodes, grouped, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [flatList.length]);

  const keyboardNav = useRef(false);
  useEffect(() => {
    if (!keyboardNav.current || !listRef.current) return;
    keyboardNav.current = false;
    const items = listRef.current.querySelectorAll("[role=option]");
    const item = items[selectedIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const performAt = useCallback(
    (idx: number) => {
      const item = flatList[idx];
      if (!item) return;
      if (item.kind === "action") item.action.perform();
      else onSelectNode(item.node.id);
      onClose();
    },
    [flatList, onSelectNode, onClose]
  );

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible && !open) return null;

  const hasQuery = query.trim().length > 0;
  const hasNothing = flatList.length === 0;
  const showBrowse = !hasQuery && grouped;
  const actionCount = filteredActions.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] transition-opacity duration-150"
      style={{ opacity: open ? 1 : 0 }}
    >
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ backgroundColor: "rgb(0 0 0 / 0.35)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label="Search nodes and commands"
        className="relative w-full max-w-xl mx-4 transition-all duration-150"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.98)",
        }}
        onKeyDown={(e) => {
          switch (e.key) {
            case "ArrowDown":
              e.preventDefault();
              keyboardNav.current = true;
              setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1));
              break;
            case "ArrowUp":
              e.preventDefault();
              keyboardNav.current = true;
              setSelectedIndex((i) => Math.max(i - 1, 0));
              break;
            case "Enter":
              e.preventDefault();
              performAt(selectedIndex);
              break;
            case "Escape":
              e.preventDefault();
              onClose();
              break;
          }
        }}
      >
        <div
          className="flex items-center gap-3 px-5 h-12 rounded-full transition-shadow"
          style={{
            backgroundColor: "var(--surface-elevated)",
            boxShadow: "var(--chrome-shadow)",
            border: "1px solid var(--border-subtle)",
          }}
        >
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
            placeholder="Search nodes or run a command…"
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder:text-text-muted outline-none focus:outline-none focus:ring-0"
          />
        </div>

        <div
          className="mt-2 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--surface-elevated)",
            boxShadow: "var(--chrome-shadow)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {hasNothing ? (
            <div className="px-5 py-6 text-center text-sm text-text-muted">
              No matching nodes or commands
            </div>
          ) : (
            <div
              ref={listRef}
              role="listbox"
              className="max-h-[22rem] overflow-y-auto py-1.5 px-1.5 no-scrollbar"
            >
              {actionCount > 0 && (
                <div>
                  <SectionHeader label="Actions" />
                  {filteredActions.map((action, i) => (
                    <ActionRow
                      key={action.id}
                      action={action}
                      selected={selectedIndex === i}
                      onClick={() => performAt(i)}
                      onHover={() => setSelectedIndex(i)}
                    />
                  ))}
                </div>
              )}

              {actionCount > 0 &&
                ((showBrowse && grouped && grouped.length > 0) ||
                  (hasQuery && filteredNodes.length > 0)) && (
                  <div
                    className="mx-3 my-1.5 h-px"
                    style={{ backgroundColor: "var(--border-subtle)" }}
                    aria-hidden
                  />
                )}

              {showBrowse ? (
                <BrowseGroups
                  groups={grouped!}
                  baseIdx={actionCount}
                  selectedIndex={selectedIndex}
                  onClick={(idx) => performAt(idx)}
                  onHover={(idx) => setSelectedIndex(idx)}
                />
              ) : hasQuery && filteredNodes.length > 0 ? (
                <div>
                  {actionCount > 0 && <SectionHeader label="Nodes" />}
                  {filteredNodes.map((node, i) => {
                    const idx = actionCount + i;
                    const selected = selectedIndex === idx;
                    return (
                      <NodeRow
                        key={node.id}
                        node={node}
                        selected={selected}
                        showCategory
                        onClick={() => performAt(idx)}
                        onHover={() => setSelectedIndex(idx)}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        {label}
      </span>
    </div>
  );
}

function ActionRow({
  action,
  selected,
  onClick,
  onHover,
}: {
  action: CommandAction;
  selected: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={onHover}
      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors rounded-xl"
      style={{
        backgroundColor: selected ? "var(--accent-soft)" : "transparent",
      }}
    >
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-[5px] shrink-0"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
          color: "var(--accent)",
        }}
        aria-hidden
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
      <span
        className="text-[13px] truncate"
        style={{
          color: selected ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      >
        {action.label}
      </span>
      {action.hint && (
        <span className="ml-auto text-[11px] text-text-muted shrink-0">
          {action.hint}
        </span>
      )}
    </button>
  );
}

function NodeRow({
  node,
  selected,
  showCategory,
  onClick,
  onHover,
}: {
  node: GraphNode;
  selected: boolean;
  showCategory: boolean;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onClick}
      onMouseEnter={onHover}
      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors rounded-xl"
      style={{
        backgroundColor: selected ? "var(--accent-soft)" : "transparent",
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: node.color }}
      />
      <span
        className="text-[13px] truncate"
        style={{
          color: selected ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      >
        {node.title}
      </span>
      {showCategory && (
        <span className="ml-auto text-[11px] text-text-muted shrink-0">
          {node.category
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      )}
    </button>
  );
}

function BrowseGroups({
  groups,
  baseIdx,
  selectedIndex,
  onClick,
  onHover,
}: {
  groups: { label: string; color: string; nodes: GraphNode[] }[];
  baseIdx: number;
  selectedIndex: number;
  onClick: (idx: number) => void;
  onHover: (idx: number) => void;
}) {
  let flatIdx = baseIdx;
  return (
    <>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: group.color }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              {group.label}
            </span>
          </div>
          {group.nodes.map((node) => {
            const idx = flatIdx++;
            const selected = idx === selectedIndex;
            return (
              <NodeRow
                key={node.id}
                node={node}
                selected={selected}
                showCategory={false}
                onClick={() => onClick(idx)}
                onHover={() => onHover(idx)}
              />
            );
          })}
        </div>
      ))}
    </>
  );
}
