"use client";

import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphNode, GraphLink } from "@/lib/types";

const MiniGraph = dynamic(() => import("./MiniGraph"), { ssr: false });

interface TocItem {
  id: string;
  text: string;
  level: number;
}

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
  const [activeId, setActiveId] = useState<string | null>(null);

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
    setActiveId(null);
  }, [node.id]);

  const { mainHtml, sourcesHtml } = useMemo(() => {
    const html = node.contentHtml;
    const sourcesMatch = html.match(
      /(<h2[^>]*id="sources"[^>]*>[\s\S]*$)/i
    );
    if (sourcesMatch) {
      return {
        mainHtml: html.slice(0, sourcesMatch.index),
        sourcesHtml: sourcesMatch[1],
      };
    }
    return { mainHtml: html, sourcesHtml: "" };
  }, [node.contentHtml]);

  const tocItems = useMemo(() => {
    const items: TocItem[] = [];
    const regex = /<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/gi;
    let match;
    while ((match = regex.exec(mainHtml)) !== null) {
      items.push({
        level: parseInt(match[1]),
        id: match[2],
        text: match[3].replace(/<[^>]*>/g, ""),
      });
    }
    return items;
  }, [mainHtml]);

  useEffect(() => {
    const scroll = scrollRef.current;
    const content = contentRef.current;
    if (!scroll || !content || tocItems.length === 0) return;

    const onScroll = () => {
      const headings = tocItems
        .map((item) => content.querySelector(`#${CSS.escape(item.id)}`))
        .filter(Boolean) as HTMLElement[];
      if (headings.length === 0) return;

      const scrollTop = scroll.scrollTop;
      const offset = 120;
      let current = headings[0]?.id ?? null;
      for (const h of headings) {
        if (h.offsetTop - scroll.offsetTop <= scrollTop + offset) {
          current = h.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    scroll.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scroll.removeEventListener("scroll", onScroll);
  }, [tocItems, node.id]);

  const handleTocClick = useCallback(
    (id: string) => {
      const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
      }
    },
    []
  );

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto panel-scroll">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 flex gap-0">
        {tocItems.length > 0 && (
          <nav className="hidden xl:block w-52 2xl:w-60 shrink-0 pt-20 pr-6">
            <div className="sticky top-8">
              <ul className="space-y-0.5">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => handleTocClick(item.id)}
                      style={{
                        color: activeId === item.id ? "var(--text-primary)" : "rgba(144,144,160,0.45)",
                      }}
                      className={`text-left w-full text-[11.5px] leading-snug py-[3px] transition-colors ${
                        item.level === 3 ? "pl-3" : ""
                      }`}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = activeId === item.id ? "var(--text-primary)" : "rgba(144,144,160,0.45)"}
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-text-primary mb-2 leading-tight">
            {node.title}
          </h1>
          <span
            className="inline-block text-xs font-medium mb-8"
            style={{ color: node.color }}
          >
            {node.category
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>

          <div className="hidden lg:block float-right ml-10 mb-6 w-96 xl:w-[420px]">
            <div className="space-y-8">
              <div>
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Connections
                </h3>
                <MiniGraph
                  currentNodeId={node.id}
                  allNodes={allNodes}
                  allLinks={links}
                  onNodeClick={onNodeClick}
                />
              </div>
              {sourcesHtml && (
                <div>
                  <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Sources
                  </h3>
                  <div
                    className="prose-apeiron prose-apeiron-sources"
                    dangerouslySetInnerHTML={{ __html: sourcesHtml.replace(/<h2[^>]*>.*?<\/h2>/i, "") }}
                  />
                </div>
              )}
            </div>
          </div>

          <div
            ref={contentRef}
            className="prose-apeiron"
            dangerouslySetInnerHTML={{ __html: mainHtml }}
          />

          <div className="clear-both" />

          <div className="lg:hidden mt-10 space-y-8">
            <div>
              <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                Connections
              </h3>
              <MiniGraph
                currentNodeId={node.id}
                allNodes={allNodes}
                allLinks={links}
                onNodeClick={onNodeClick}
              />
            </div>
            {sourcesHtml && (
              <div>
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Sources
                </h3>
                <div
                  className="prose-apeiron prose-apeiron-sources"
                  dangerouslySetInnerHTML={{ __html: sourcesHtml.replace(/<h2[^>]*>.*?<\/h2>/i, "") }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
