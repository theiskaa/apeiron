"use client";

import { useCallback, useRef, useEffect } from "react";
import type { GraphNode, GraphLink } from "@/lib/types";

interface Props {
  node: GraphNode;
  links: GraphLink[];
  allNodes: GraphNode[];
  onNodeClick: (nodeId: string) => void;
}

export default function NodeView({
  node,
  links,
  allNodes,
  onNodeClick,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Intercept [[wiki link]] clicks
  const handleContentClick = useCallback(
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-node-link]");
      if (target) {
        e.preventDefault();
        const nodeId = target.getAttribute("data-node-link");
        if (nodeId) onNodeClick(nodeId);
      }
    },
    [onNodeClick]
  );

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener("click", handleContentClick);
    return () => el.removeEventListener("click", handleContentClick);
  }, [handleContentClick]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [node.id]);

  const connectedLinks = links.filter((l) => {
    const src = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
    const tgt = typeof l.target === "object" ? (l.target as GraphNode).id : l.target;
    return src === node.id || tgt === node.id;
  });

  const connectedNodes = connectedLinks
    .map((l) => {
      const src = typeof l.source === "object" ? (l.source as GraphNode).id : l.source;
      const tgt = typeof l.target === "object" ? (l.target as GraphNode).id : l.target;
      const targetId = src === node.id ? tgt : src;
      return {
        node: allNodes.find((n) => n.id === targetId),
        reason: l.reason,
      };
    })
    .filter((c) => c.node);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto panel-scroll">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-bold text-text-primary mb-2 leading-tight">
          {node.title}
        </h1>

        <span
          className="inline-block text-xs font-medium mb-8"
          style={{ color: node.color }}
        >
          {node.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>

        <div
          ref={contentRef}
          className="prose-apeiron"
          dangerouslySetInnerHTML={{ __html: node.contentHtml }}
        />

        {connectedNodes.length > 0 && (
          <div className="mt-10 pt-8 border-t border-border">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Connections
            </h2>
            <div className="grid gap-2">
              {connectedNodes.map(({ node: cn, reason }) => {
                if (!cn) return null;
                return (
                  <button
                    key={cn.id}
                    onClick={() => onNodeClick(cn.id)}
                    className="text-left p-3 rounded-lg border border-border
                      hover:bg-surface transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cn.color }}
                      />
                      <span className="text-sm font-medium text-text-primary group-hover:text-white transition-colors">
                        {cn.title}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted pl-4">{reason}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
