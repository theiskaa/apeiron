"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import Navbar from "./Navbar";
import CategoryPicker from "./CategoryPicker";
import type { Category, GraphNode, GraphLink } from "@/lib/types";

const MiniGraph = dynamic(() => import("./MiniGraph"), { ssr: false });

const GITHUB_REPO = "https://github.com/theiskaa/apeirron";

interface NodeRef {
  id: string;
  title: string;
  color: string;
}

interface Connection {
  target: string;
  reason: string;
}

interface Props {
  categories: Category[];
  nodeList: NodeRef[];
  prefillTitle?: string;
  prefillNodeId?: string;
}

type SubmitResult =
  | { success: true; issueUrl: string }
  | { success: false; error: string }
  | null;

function deriveId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ContributeForm({
  categories,
  nodeList,
  prefillTitle = "",
  prefillNodeId,
}: Props) {
  const STORAGE_KEY = "apeirron-contribute-draft";
  const saved = useRef<Record<string, unknown> | null>(null);
  if (saved.current === null && typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      saved.current = raw ? JSON.parse(raw) : {};
    } catch {
      saved.current = {};
    }
  }
  const s = saved.current ?? {};

  const [title, setTitle] = useState((s.title as string) || prefillTitle);
  const [category, setCategory] = useState((s.category as string) || "");
  const [content, setContent] = useState((s.content as string) || "");
  const [sources, setSources] = useState((s.sources as string) || "");
  const [connections, setConnections] = useState<Connection[]>(
    (s.connections as Connection[] | undefined)?.length
      ? (s.connections as Connection[])
      : [{ target: "", reason: "" }]
  );
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [previewHtml, setPreviewHtml] = useState("");
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ title, category, content, sources, connections })
        );
      } catch { /* quota exceeded — ignore */ }
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [title, category, content, sources, connections]);

  // Derived state
  const currentId = deriveId(title) || "new-node";
  const currentColor =
    categories.find((c) => c.id === category)?.color ?? "#666666";
  const validConnections = connections.filter(
    (c) => c.target.trim() && c.reason.trim()
  );
  const canSubmit =
    title.trim().length >= 3 &&
    category !== "" &&
    content.trim().length >= 100 &&
    !submitting;


  // Stable key for graph topology — only changes when targets change, not reasons
  const connectionTargets = connections.map((c) => c.target.trim()).join(",");

  // Live MiniGraph data — only recomputes when topology changes
  const miniGraphData = useMemo(() => {
    const conns = connections.filter((c) => c.target.trim());
    const nodes: GraphNode[] = [
      {
        id: currentId,
        title: title || "New Node",
        category: category || "mind",
        color: currentColor,
        val: Math.max(conns.length, 1),
        contentHtml: "",
      },
    ];

    const addedIds = new Set([currentId]);
    for (const conn of conns) {
      const tid = conn.target.trim();
      if (addedIds.has(tid)) continue;
      addedIds.add(tid);
      const existing = nodeList.find((n) => n.id === tid);
      nodes.push({
        id: tid,
        title:
          existing?.title ??
          tid
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
        category: "phantom",
        color: existing?.color ?? "#666666",
        val: 1,
        contentHtml: "",
        phantom: !existing,
      });
    }

    const links: GraphLink[] = conns.map((c) => ({
      source: currentId,
      target: c.target.trim(),
      reason: c.reason.trim(),
    }));

    return { nodes, links };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, title, category, currentColor, connectionTargets, nodeList]);

  useEffect(() => {
    if (mode !== "preview") return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(rehypeStringify)
        .process(content);
      setPreviewHtml(result.toString());
    }, 150);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [content, mode]);

  const addConnection = useCallback(() => {
    setConnections((prev) =>
      prev.length < 10 ? [...prev, { target: "", reason: "" }] : prev
    );
  }, []);

  const removeConnection = useCallback((index: number) => {
    setConnections((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  }, []);

  const updateConnection = useCallback(
    (index: number, field: "target" | "reason", value: string) => {
      setConnections((prev) =>
        prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
      );
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/propose-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          connections: validConnections,
          content: content.trim(),
          sources: sources.trim(),
          _hp: honeypot,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, issueUrl: data.issueUrl });
      } else {
        setResult({
          success: false,
          error: data.error || "Something went wrong.",
        });
      }
    } catch {
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, title, category, validConnections, content, sources, honeypot]);

  const resetForm = useCallback(() => {
    setTitle("");
    setCategory("");
    setContent("");
    setSources("");
    setConnections([{ target: "", reason: "" }]);
    setResult(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  if (result?.success) {
    return (
      <div className="fixed inset-0 overflow-y-auto bg-background">
        <Navbar
          onLogoClick={() => {
            window.location.href = "/";
          }}
        />
        <div className="max-w-[720px] mx-auto px-6 lg:px-12 py-16">
          <div
            className="rounded-lg px-6 py-10 border text-center"
            style={{
              borderColor: "rgba(144,144,160,0.15)",
              backgroundColor: "rgba(144,144,160,0.03)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ backgroundColor: "rgba(80,180,120,0.12)" }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: "rgba(80,180,120,0.9)" }}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Proposal submitted
            </h2>
            <div className="text-sm text-text-secondary space-y-3 mb-8 text-left max-w-md mx-auto">
              <p>
                Your node has been submitted as a proposal to the Apeirron knowledge graph.
                A maintainer will review it, and one of the following will happen:
              </p>
              <ul className="space-y-2 text-[13px]" style={{ color: "rgba(144,144,160,0.7)" }}>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5" style={{ color: "rgba(80,180,120,0.8)" }}>&#10003;</span>
                  <span><strong className="text-text-secondary">Accepted as-is</strong> — your content is added directly to the graph with full credit.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5" style={{ color: "rgba(200,170,60,0.8)" }}>&#9998;</span>
                  <span><strong className="text-text-secondary">Accepted with edits</strong> — a maintainer may refine the writing, adjust connections, or restructure sections before adding it.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5" style={{ color: "rgba(180,100,100,0.8)" }}>&#10007;</span>
                  <span><strong className="text-text-secondary">Not added</strong> — if the topic doesn&apos;t fit the graph, overlaps with an existing node, or needs significantly more research, it may be declined with feedback.</span>
                </li>
              </ul>
              <p className="text-[12px]" style={{ color: "rgba(144,144,160,0.5)" }}>
                You can track the status of your proposal on GitHub. Maintainers may leave comments
                or questions on the issue — no GitHub account is needed to view it, but you&apos;ll need one to reply.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a
                href={result.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border bg-surface text-text-primary hover:brightness-110 transition-all"
              >
                View on GitHub
              </a>
              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                className="px-4 py-2 rounded-md text-sm font-medium border border-border bg-surface text-text-primary hover:brightness-110 transition-all"
              >
                Back to graph
              </button>
              <button
                onClick={() => {
                  resetForm();
                  window.history.replaceState(null, "", "/contribute");
                }}
                className="px-4 py-2 rounded-md text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                Submit another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const connectionsUI = (
    <div>
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
        Connections
      </h3>
      <MiniGraph
        currentNodeId={currentId}
        allNodes={miniGraphData.nodes}
        allLinks={miniGraphData.links}
        onNodeClick={() => {}}
      />
      <div className="mt-4 space-y-3">
        {connections.map((conn, i) => {
          const targetNode = nodeList.find((n) => n.id === conn.target.trim());
          const dotColor = targetNode?.color ?? "rgba(144,144,160,0.4)";
          return (
            <div key={i} className="flex gap-2">
              <div className="flex flex-col items-center shrink-0 pt-2.5">
                <span
                  className="w-[5px] h-[5px] rounded-full shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span
                  className="w-px flex-1 mt-1"
                  style={{ backgroundColor: dotColor, opacity: 0.25 }}
                />
              </div>
              <div className="flex-1 space-y-1.5 pb-1">
                <input
                  type="text"
                  list="node-targets"
                  value={conn.target}
                  onChange={(e) => updateConnection(i, "target", e.target.value)}
                  placeholder="Target node (e.g. mkultra)"
                  className="w-full rounded px-2 py-1 text-[12px] font-medium bg-surface border border-border text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-text-muted/30"
                />
                <input
                  type="text"
                  value={conn.reason}
                  onChange={(e) => updateConnection(i, "reason", e.target.value)}
                  placeholder="Why does this connect?"
                  className="w-full rounded px-2 py-1 text-[11px] bg-surface border border-border text-text-secondary placeholder:text-text-muted/40 focus:outline-none focus:ring-1 focus:ring-text-muted/30 leading-relaxed"
                />
              </div>
              <button
                type="button"
                onClick={() => removeConnection(i)}
                className="mt-2 p-0.5 rounded text-text-muted hover:text-text-secondary transition-colors shrink-0"
                aria-label="Remove connection"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      <datalist id="node-targets">
        {nodeList.map((n) => (
          <option key={n.id} value={n.id}>
            {n.title}
          </option>
        ))}
      </datalist>
      {connections.length < 10 && (
        <button
          type="button"
          onClick={addConnection}
          className="mt-2 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
        >
          + Add connection
        </button>
      )}
    </div>
  );

  const sourcesUI = (
    <div>
      <h3 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">
        Sources
      </h3>
      <textarea
        value={sources}
        onChange={(e) => setSources(e.target.value)}
        rows={6}
        placeholder={"- Author. *Title*. Publisher, Year.\n- Author. *Title*. Publisher, Year."}
        className="w-full rounded px-2 py-1.5 text-[11px] bg-surface border border-border text-text-secondary placeholder:text-text-muted/30 focus:outline-none focus:ring-1 focus:ring-text-muted/30 leading-relaxed resize-y font-mono"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-background flex flex-col">
      <Navbar
        onLogoClick={() => {
          window.location.href = "/";
        }}
      />

      {result && !result.success && (
        <div
          className="mx-auto max-w-[1400px] w-full px-6 lg:px-12"
        >
          <div
            className="rounded-lg px-4 py-3 text-sm border"
            style={{
              borderColor: "rgba(200,80,80,0.25)",
              backgroundColor: "rgba(200,80,80,0.06)",
              color: "var(--text-secondary)",
            }}
          >
            <p>{result.error}</p>
            <p className="mt-1 text-xs text-text-muted">
              You can also{" "}
              <a
                href={`${GITHUB_REPO}/issues/new?template=new-node.yml`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                contribute directly on GitHub
              </a>
              .
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto panel-scroll">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 flex gap-0">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Node title..."
              className="w-full text-3xl font-bold text-text-primary mb-2 leading-tight bg-transparent outline-none placeholder:text-text-muted/30 border-none p-0"
            />

            <CategoryPicker
              categories={categories}
              value={category}
              onChange={setCategory}
            />

            <div className="flex items-center mb-5">
              <div
                className="relative inline-flex rounded-full p-0.5"
                style={{ backgroundColor: "rgba(144,144,160,0.1)" }}
              >
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="relative z-10 rounded-full px-3.5 py-1 text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: mode === "edit" ? "var(--surface)" : "transparent",
                    color: mode === "edit" ? "var(--text-primary)" : "var(--text-muted)",
                    boxShadow: mode === "edit" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setMode("preview")}
                  className="relative z-10 rounded-full px-3.5 py-1 text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: mode === "preview" ? "var(--surface)" : "transparent",
                    color: mode === "preview" ? "var(--text-primary)" : "var(--text-muted)",
                    boxShadow: mode === "preview" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  Preview
                </button>
              </div>
            </div>

            <div className="flex gap-10">
              <div className="flex-1 min-w-0">
                {mode === "edit" ? (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      "Write the node content in markdown...\n\nStart with an opening paragraph, then use ## headings for sections.\n\n## The official story\n\n...\n\n## The deeper question\n\n..."
                    }
                    className="w-full min-h-[600px] bg-transparent text-[15px] leading-[1.85] text-text-primary outline-none resize-y placeholder:text-text-muted/25 border-none p-0 font-[inherit]"
                  />
                ) : (
                  <div className="min-h-[600px] max-w-full overflow-hidden">
                    {content.trim() ? (
                      <div
                        className="prose-apeiron max-w-none"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                      />
                    ) : (
                      <p className="text-text-muted/40 text-[15px] leading-[1.85] italic">
                        Nothing to preview yet. Switch to Edit and start writing.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden lg:block w-96 xl:w-[420px] shrink-0">
                <div className="sticky top-8 space-y-8">
                  {connectionsUI}
                  <hr style={{ borderColor: "rgba(144,144,160,0.15)" }} />
                  {sourcesUI}
                </div>
              </div>
            </div>

            <div className="lg:hidden mt-10 space-y-8">
              {connectionsUI}
              {sourcesUI}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div
        className="shrink-0 border-t px-6 lg:px-12 py-3 flex items-center gap-4"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-[1400px] mx-auto w-full flex items-center gap-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-border bg-surface text-text-primary hover:brightness-110"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Proposal"
            )}
          </button>
          <span className="text-[11px] text-text-muted">
            No GitHub account needed
          </span>
          {prefillNodeId && (
            <span className="text-[11px] text-text-muted ml-auto hidden sm:block">
              Proposing: <strong className="text-text-secondary">{prefillTitle}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
