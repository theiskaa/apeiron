"use client";

import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphNode, GraphLink } from "@/lib/types";
import { READING_PATHS } from "@/lib/paths";

const MiniGraph = dynamic(() => import("./MiniGraph"), { ssr: false });
const MiniPathDiagram = dynamic(() => import("./MiniPathDiagram"), {
  ssr: false,
});

type MiniView = "graph" | "path";
const MINI_VIEW_STORAGE_KEY = "apeirron-node-mini-view";

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

const GITHUB_REPO = "https://github.com/theiskaa/apeirron";

export default function NodeView({
  node,
  links,
  allNodes,
  onNodeClick,
}: Props) {
  if (node.phantom) {
    return (
      <PhantomNodeView
        node={node}
        links={links}
        allNodes={allNodes}
        onNodeClick={onNodeClick}
      />
    );
  }
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [miniView, setMiniView] = useState<MiniView>("graph");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MINI_VIEW_STORAGE_KEY);
      if (saved === "graph" || saved === "path") setMiniView(saved);
    } catch {}
  }, []);

  const handleMiniViewChange = useCallback((v: MiniView) => {
    setMiniView(v);
    try {
      localStorage.setItem(MINI_VIEW_STORAGE_KEY, v);
    } catch {}
  }, []);

  const handleContentClick = useCallback(
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-node-link]");
      if (target) {
        e.preventDefault();
        const nodeId = target.getAttribute("data-node-link");
        if (nodeId) onNodeClick(nodeId);
        return;
      }
      const heading = (e.target as HTMLElement).closest("h2[id], h3[id]");
      if (heading) {
        const id = heading.getAttribute("id");
        if (id) {
          heading.scrollIntoView({ behavior: "smooth", block: "start" });
          setActiveId(id);
          window.history.replaceState(null, "", `#${id}`);
        }
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
    const items: TocItem[] = [
      { id: "_top", text: node.title, level: 1 },
    ];
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
  }, [mainHtml, node.title]);

  useEffect(() => {
    const scroll = scrollRef.current;
    const content = contentRef.current;
    if (!scroll || !content || tocItems.length === 0) return;

    let ticking = false;
    let urlTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;

        const realItems = tocItems.filter((item) => item.id !== "_top");
        const headings = realItems
          .map((item) => content.querySelector(`#${CSS.escape(item.id)}`))
          .filter(Boolean) as HTMLElement[];

        const scrollTop = scroll.scrollTop;
        const offset = 120;

        if (headings.length === 0 || headings[0].offsetTop - scroll.offsetTop > scrollTop + offset) {
          setActiveId("_top");
          if (urlTimer) clearTimeout(urlTimer);
          urlTimer = setTimeout(() => {
            window.history.replaceState(null, "", window.location.pathname);
          }, 150);
          return;
        }

        let current = headings[0]?.id ?? "_top";
        for (const h of headings) {
          if (h.offsetTop - scroll.offsetTop <= scrollTop + offset) {
            current = h.id;
          } else {
            break;
          }
        }
        setActiveId(current);
        if (urlTimer) clearTimeout(urlTimer);
        urlTimer = setTimeout(() => {
          window.history.replaceState(null, "", current === "_top" ? window.location.pathname : `#${current}`);
        }, 150);
      });
    };

    scroll.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      scroll.removeEventListener("scroll", onScroll);
      if (urlTimer) clearTimeout(urlTimer);
    };
  }, [tocItems, node.id]);

  const handleTocClick = useCallback(
    (id: string) => {
      if (id === "_top") {
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        setActiveId(id);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }
      const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
        window.history.replaceState(null, "", `#${id}`);
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
                      className={`text-left w-full text-[11px] leading-snug py-[3px] transition-colors ${
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    {miniView === "graph" ? "Connections" : "Path"}
                  </h3>
                  <MiniViewToggle
                    value={miniView}
                    onChange={handleMiniViewChange}
                  />
                </div>
                {miniView === "graph" ? (
                  <MiniGraph
                    currentNodeId={node.id}
                    allNodes={allNodes}
                    allLinks={links}
                    onNodeClick={onNodeClick}
                  />
                ) : (
                  <MiniPathDiagram
                    currentNodeId={node.id}
                    allNodes={allNodes}
                    onNodeClick={onNodeClick}
                  />
                )}
                <ConnectionReasons
                  nodeId={node.id}
                  links={links}
                  allNodes={allNodes}
                  onNodeClick={onNodeClick}
                />
              </div>
              {sourcesHtml && (
                <>
                  <hr style={{ borderColor: "rgba(144,144,160,0.15)" }} />
                  <div>
                    <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                      Sources
                    </h3>
                    <div
                      className="prose-apeirron prose-apeirron-sources"
                      dangerouslySetInnerHTML={{ __html: sourcesHtml.replace(/<h2[^>]*>.*?<\/h2>/i, "") }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div
            ref={contentRef}
            className="prose-apeirron"
            dangerouslySetInnerHTML={{ __html: mainHtml }}
          />

          <ReadNext
            nodeId={node.id}
            allNodes={allNodes}
            onNodeClick={onNodeClick}
          />

          <div className="clear-both" />

          <div className="lg:hidden mt-10 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  {miniView === "graph" ? "Connections" : "Path"}
                </h3>
                <MiniViewToggle
                  value={miniView}
                  onChange={handleMiniViewChange}
                />
              </div>
              {miniView === "graph" ? (
                <MiniGraph
                  currentNodeId={node.id}
                  allNodes={allNodes}
                  allLinks={links}
                  onNodeClick={onNodeClick}
                />
              ) : (
                <MiniPathDiagram
                  currentNodeId={node.id}
                  allNodes={allNodes}
                  onNodeClick={onNodeClick}
                />
              )}
              <ConnectionReasons
                nodeId={node.id}
                links={links}
                allNodes={allNodes}
                onNodeClick={onNodeClick}
              />
            </div>
            {sourcesHtml && (
              <div>
                <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Sources
                </h3>
                <div
                  className="prose-apeirron prose-apeirron-sources"
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

function PhantomNodeView({
  node,
  links,
  allNodes,
  onNodeClick,
}: Props) {
  const nodeMap = useMemo(
    () => new Map(allNodes.map((n) => [n.id, n])),
    [allNodes]
  );

  // Find all real nodes that reference this phantom node
  const referencedBy = useMemo(() => {
    const getId = (v: any): string => (typeof v === "object" && v !== null ? v.id : v);
    return links
      .filter((l) => getId(l.source) === node.id || getId(l.target) === node.id)
      .map((l) => {
        const srcId = getId(l.source);
        const tgtId = getId(l.target);
        const otherId = srcId === node.id ? tgtId : srcId;
        const other = nodeMap.get(otherId);
        if (!other) return null;
        return { id: otherId, title: other.title, color: other.color, reason: l.reason };
      })
      .filter(Boolean) as { id: string; title: string; color: string; reason: string }[];
  }, [links, node.id, nodeMap]);

  const referencedByList = (
    <>
      {referencedBy.length > 0 && (
        <div className="mt-6">
          <h3
            className="text-[11px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: "rgba(144,144,160,0.6)" }}
          >
            Referenced by
          </h3>
          <div className="space-y-2.5">
            {referencedBy.map((r) => (
              <button
                key={r.id}
                onClick={() => onNodeClick(r.id)}
                className="block w-full text-left group cursor-pointer"
              >
                <div className="flex gap-2">
                  <div className="flex flex-col items-center shrink-0 pt-[5px]">
                    <span
                      className="w-[5px] h-[5px] rounded-full shrink-0"
                      style={{ backgroundColor: r.color }}
                    />
                    <span
                      className="w-px flex-1 mt-1"
                      style={{ backgroundColor: r.color, opacity: 0.25 }}
                    />
                  </div>
                  <div className="pb-1">
                    <span className="text-[12px] font-medium text-text-primary group-hover:underline block">
                      {r.title}
                    </span>
                    <span
                      className="block text-[11px] leading-relaxed mt-0.5"
                      style={{ color: "rgba(144,144,160,0.65)" }}
                    >
                      {r.reason}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="h-full overflow-y-auto panel-scroll">
      <div className="max-w-[720px] mx-auto px-6 lg:px-12 py-8">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-bold text-text-primary leading-tight">
            {node.title}
          </h1>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border"
            style={{
              color: "rgba(144,144,160,0.8)",
              borderColor: "rgba(144,144,160,0.25)",
              backgroundColor: "rgba(144,144,160,0.06)",
            }}
          >
            Proposed
          </span>
        </div>

        <div
          className="rounded-lg px-6 py-8 border"
          style={{
            borderColor: "rgba(144,144,160,0.15)",
            backgroundColor: "rgba(144,144,160,0.03)",
          }}
        >
          <div className="flex items-start gap-3 mb-4">
            <svg
              className="w-5 h-5 mt-0.5 shrink-0"
              style={{ color: "rgba(144,144,160,0.6)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <div>
              <p className="text-sm text-text-secondary leading-relaxed">
                This node hasn&apos;t been written yet. It exists as a proposed topic based on
                connections from other nodes in the graph.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(144,144,160,0.12)" }}>
            <p className="text-xs text-text-muted mb-4">
              Want to write this node? Contributions are welcome.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={`/contribute?node=${node.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "rgba(144,144,160,0.1)",
                  color: "var(--text-primary)",
                  border: "1px solid rgba(144,144,160,0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(144,144,160,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(144,144,160,0.1)";
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Write this node
              </a>
              <a
                href={`${GITHUB_REPO}/issues/new?template=new-node.yml&title=${encodeURIComponent("New node: " + node.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                or contribute on GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
            Connections
          </h3>
          <MiniGraph
            currentNodeId={node.id}
            allNodes={allNodes}
            allLinks={links}
            onNodeClick={onNodeClick}
          />
          {referencedByList}
        </div>
      </div>
    </div>
  );
}

function ConnectionReasons({
  nodeId,
  links,
  allNodes,
  onNodeClick,
}: {
  nodeId: string;
  links: GraphLink[];
  allNodes: GraphNode[];
  onNodeClick: (id: string) => void;
}) {
  const nodeMap = useMemo(
    () => new Map(allNodes.map((n) => [n.id, n])),
    [allNodes]
  );

  const reasons = useMemo(() => {
    const getId = (v: any): string => (typeof v === "object" && v !== null ? v.id : v);
    return links
      .filter((l) => getId(l.source) === nodeId || getId(l.target) === nodeId)
      .map((l) => {
        const srcId = getId(l.source);
        const tgtId = getId(l.target);
        const otherId = srcId === nodeId ? tgtId : srcId;
        const other = nodeMap.get(otherId);
        if (!other) return null;
        return { id: otherId, title: other.title, color: other.color, reason: l.reason };
      })
      .filter(Boolean) as { id: string; title: string; color: string; reason: string }[];
  }, [links, nodeId, nodeMap]);

  if (reasons.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
        Why these connect
      </h3>
      <div className="space-y-2.5">
        {reasons.map((r) => (
          <button
            key={r.id}
            onClick={() => onNodeClick(r.id)}
            className="block w-full text-left group cursor-pointer"
          >
            <div className="flex gap-2">
              <div className="flex flex-col items-center shrink-0 pt-[5px]">
                <span
                  className="w-[5px] h-[5px] rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />
                <span
                  className="w-px flex-1 mt-1"
                  style={{ backgroundColor: r.color, opacity: 0.25 }}
                />
              </div>
              <div className="pb-1">
                <span className="text-[12px] font-medium text-text-primary group-hover:underline block">
                  {r.title}
                </span>
                <span className="block text-[11px] leading-relaxed mt-0.5" style={{ color: "rgba(144,144,160,0.65)" }}>
                  {r.reason}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniViewToggle({
  value,
  onChange,
}: {
  value: MiniView;
  onChange: (v: MiniView) => void;
}) {
  const options: { id: MiniView; label: string }[] = [
    { id: "graph", label: "Graph" },
    { id: "path", label: "Path" },
  ];
  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-full"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--text-primary) 5%, transparent)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 8%, transparent)",
      }}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase leading-none transition-all ${
              active
                ? "text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
            style={
              active
                ? {
                    backgroundColor:
                      "color-mix(in srgb, var(--surface) 90%, transparent)",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px color-mix(in srgb, var(--text-primary) 8%, transparent)",
                  }
                : undefined
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ReadNext({
  nodeId,
  allNodes,
  onNodeClick,
}: {
  nodeId: string;
  allNodes: GraphNode[];
  onNodeClick: (id: string) => void;
}) {
  const nodeMap = useMemo(
    () => new Map(allNodes.map((n) => [n.id, n])),
    [allNodes]
  );

  const suggestions = useMemo(() => {
    const results: {
      pathTitle: string;
      pathId: string;
      node: GraphNode;
      hook: string;
      label: string;
      isNextPath?: boolean;
    }[] = [];
    const seen = new Set<string>();

    for (let pi = 0; pi < READING_PATHS.length; pi++) {
      const path = READING_PATHS[pi];
      const idx = path.nodes.findIndex((pn) => pn.id === nodeId);
      if (idx === -1) continue;

      if (idx < path.nodes.length - 1) {
        const next = path.nodes[idx + 1];
        if (seen.has(next.id)) continue;
        const nextNode = nodeMap.get(next.id);
        if (!nextNode) continue;
        seen.add(next.id);
        results.push({
          pathTitle: path.title,
          pathId: path.id,
          node: nextNode,
          hook: next.hook,
          label: `${idx + 2} of ${path.nodes.length}`,
        });
      } else {
        const nextPath = READING_PATHS[pi + 1];
        if (!nextPath || nextPath.nodes.length === 0) continue;
        const first = nextPath.nodes[0];
        if (seen.has(`path:${nextPath.id}`)) continue;
        const firstNode = nodeMap.get(first.id);
        if (!firstNode) continue;
        seen.add(`path:${nextPath.id}`);
        results.push({
          pathTitle: nextPath.title,
          pathId: nextPath.id,
          node: firstNode,
          hook: nextPath.description,
          label: `1 of ${nextPath.nodes.length}`,
          isNextPath: true,
        });
      }
    }
    return results;
  }, [nodeId, nodeMap]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-14 mb-8">
      <div
        className="w-full h-px mb-8"
        style={{ backgroundColor: "color-mix(in srgb, var(--text-primary) 6%, transparent)" }}
      />
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-4">
        Read next
      </h3>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns:
            suggestions.length > 1
              ? "repeat(auto-fit, minmax(260px, 1fr))"
              : "1fr",
        }}
      >
        {suggestions.map((s) => (
          <button
            key={`${s.pathId}-${s.node.id}`}
            onClick={() => onNodeClick(s.node.id)}
            className="group text-left rounded-xl p-4 transition-all duration-150 hover:scale-[1.01]"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--text-primary) 3%, transparent)",
              boxShadow:
                "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 7%, transparent)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "color-mix(in srgb, var(--text-primary) 6%, transparent)";
              e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${s.node.color}33`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "color-mix(in srgb, var(--text-primary) 3%, transparent)";
              e.currentTarget.style.boxShadow =
                "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 7%, transparent)";
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-text-muted/50 tracking-wide">
                {s.isNextPath ? "Next path" : s.pathTitle}
              </span>
              {s.isNextPath && (
                <span className="text-[10px] text-text-muted/35 tracking-wide">
                  — {s.pathTitle}
                </span>
              )}
              <span className="text-[9px] text-text-muted/30 tabular-nums ml-auto">
                {s.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.node.color }}
              />
              <span className="text-[15px] font-medium text-text-primary group-hover:text-text-primary/90 transition-colors">
                {s.node.title}
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-auto shrink-0 text-text-muted/30 group-hover:text-text-muted/70 group-hover:translate-x-0.5 transition-all"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <p className="text-[12px] text-text-muted/60 group-hover:text-text-muted/80 transition-colors mt-1.5 ml-5 leading-snug">
              {s.hook}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
