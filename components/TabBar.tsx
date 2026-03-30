"use client";

import type { GraphNode } from "@/lib/types";

export interface Tab {
  id: string;
  type: "graph" | "node";
  nodeId?: string;
}

interface Props {
  tabs: Tab[];
  activeTabId: string;
  nodes: GraphNode[];
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export default function TabBar({
  tabs,
  activeTabId,
  nodes,
  onSelectTab,
  onCloseTab,
}: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="relative z-10 flex items-center gap-2 px-3 md:px-8 py-1.5 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isGraph = tab.type === "graph";
        const node = tab.type === "node" ? nodeMap.get(tab.nodeId!) : null;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group flex items-center gap-1.5 py-1 px-2.5 text-[11.5px] rounded-full shrink-0 transition-all duration-150
              ${isActive
                ? "text-text-primary ring-1"
                : "text-text-muted hover:text-text-secondary hover:bg-text-primary/[0.04]"
              }
              ${isActive ? "" : "max-w-[140px]"}
            `}
            style={isActive ? (isGraph ? {
              backgroundColor: "color-mix(in srgb, var(--text-primary) 7%, transparent)",
              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 13%, transparent)",
            } : {
              backgroundColor: `${node?.color ?? "#666"}11`,
              boxShadow: `inset 0 0 0 1px ${node?.color ?? "#666"}22`,
            }) : undefined}
          >
            {isGraph ? (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="shrink-0 opacity-50"
              >
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="18" r="3" />
                <circle cx="18" cy="6" r="3" />
                <line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
                <line x1="8.5" y1="6" x2="15.5" y2="6" />
              </svg>
            ) : (
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ backgroundColor: node?.color ?? "#666" }}
              />
            )}

            <span className={isActive ? "whitespace-nowrap" : "truncate"}>
              {isGraph ? "Graph" : node?.title ?? "Unknown"}
            </span>

            {!isGraph && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`shrink-0 rounded-full flex items-center justify-center
                  hover:bg-text-primary/10 hover:text-text-primary
                  transition-all duration-200 origin-center
                  ${isActive
                    ? "w-4 h-4 opacity-40 hover:opacity-100 scale-100 ml-0.5"
                    : "w-0 h-0 opacity-0 scale-0 group-hover:w-4 group-hover:h-4 group-hover:opacity-40 group-hover:scale-100 group-hover:ml-0.5 hover:!opacity-100"
                  }
                `}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="block"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
