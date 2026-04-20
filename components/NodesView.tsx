"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./Navbar";
import type { Category } from "@/lib/types";

interface NodeListItem {
  id: string;
  title: string;
}

interface CategoryWithNodes {
  category: Category;
  nodes: NodeListItem[];
}

interface Props {
  groups: CategoryWithNodes[];
  totalCount: number;
}

export default function NodesView({ groups, totalCount }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>("_top");

  const tocIds = useMemo(
    () => groups.map((g) => `category-${g.category.id}`),
    [groups]
  );

  useEffect(() => {
    const scroll = scrollRef.current;
    const content = contentRef.current;
    if (!scroll || !content) return;

    let ticking = false;
    let urlTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;

        const headings = tocIds
          .map((id) => content.querySelector(`#${CSS.escape(id)}`))
          .filter(Boolean) as HTMLElement[];

        const scrollTop = scroll.scrollTop;
        const offset = 120;

        if (
          headings.length === 0 ||
          headings[0].offsetTop - scroll.offsetTop > scrollTop + offset
        ) {
          setActiveId("_top");
          if (urlTimer) clearTimeout(urlTimer);
          urlTimer = setTimeout(() => {
            window.history.replaceState(null, "", window.location.pathname);
          }, 150);
          return;
        }

        let current = headings[0].id;
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
          window.history.replaceState(
            null,
            "",
            current === "_top" ? window.location.pathname : `#${current}`
          );
        }, 150);
      });
    };

    scroll.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // On mount, honour hash in URL
    const hash =
      typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash) {
      const el = content.querySelector(`#${CSS.escape(hash)}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "auto", block: "start" });
        }, 0);
      }
    }

    return () => {
      scroll.removeEventListener("scroll", onScroll);
      if (urlTimer) clearTimeout(urlTimer);
    };
  }, [tocIds]);

  const handleTocClick = useCallback((id: string) => {
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
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-text-primary">
      <Navbar />
      <div ref={scrollRef} className="flex-1 overflow-y-auto panel-scroll">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 flex gap-0">
          <nav
            aria-label="Categories"
            className="hidden xl:block w-52 2xl:w-60 shrink-0 pt-20 pr-6"
          >
            <div className="sticky top-8">
              <ul className="space-y-0.5">
                <li>
                  <button
                    onClick={() => handleTocClick("_top")}
                    style={{
                      color:
                        activeId === "_top"
                          ? "var(--text-primary)"
                          : "rgba(144,144,160,0.45)",
                    }}
                    className="text-left w-full text-[11px] leading-snug py-[3px] transition-colors"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--text-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color =
                        activeId === "_top"
                          ? "var(--text-primary)"
                          : "rgba(144,144,160,0.45)")
                    }
                  >
                    All nodes
                  </button>
                </li>
                {groups.map(({ category, nodes }) => {
                  const id = `category-${category.id}`;
                  const active = activeId === id;
                  return (
                    <li key={category.id}>
                      <button
                        onClick={() => handleTocClick(id)}
                        style={{
                          color: active
                            ? "var(--text-primary)"
                            : "rgba(144,144,160,0.45)",
                        }}
                        className="flex items-center gap-2 text-left w-full text-[11px] leading-snug py-[3px] transition-colors"
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "var(--text-primary)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = active
                            ? "var(--text-primary)"
                            : "rgba(144,144,160,0.45)")
                        }
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: category.color }}
                          aria-hidden="true"
                        />
                        <span className="flex-1">{category.label}</span>
                        <span className="text-text-muted/60 tabular-nums text-[10px]">
                          {nodes.length}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          <article ref={contentRef} className="flex-1 min-w-0 max-w-[860px]">
            <header className="mb-10">
              <h1 className="text-3xl font-bold text-text-primary mb-2 leading-tight">
                All nodes
              </h1>
              <span
                className="inline-block text-xs font-medium mb-6"
                style={{ color: "rgba(144,144,160,0.7)" }}
              >
                {totalCount} topics · {groups.length} categories
              </span>
              <p
                className="leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Every node in the Apeirron graph, grouped by category. Each is
                a self-contained investigation, primary-sourced and
                interlinked. Click any title to read the node.
              </p>
              <div className="mt-6 flex flex-wrap gap-1.5 xl:hidden">
                {groups.map(({ category, nodes }) => (
                  <button
                    key={category.id}
                    onClick={() => handleTocClick(`category-${category.id}`)}
                    className="chrome inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] text-text-secondary"
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                    {category.label}
                    <span className="text-text-muted/60 tabular-nums">
                      {nodes.length}
                    </span>
                  </button>
                ))}
              </div>
            </header>

            {groups.map(({ category, nodes }) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="mb-14 scroll-mt-24"
              >
                <div className="flex items-baseline gap-3 mb-5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                    aria-hidden="true"
                  />
                  <h2
                    className="text-xl font-semibold tracking-wide"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {category.label}
                  </h2>
                  <span className="text-[11px] text-text-muted/60 tabular-nums">
                    {nodes.length}
                  </span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5">
                  {nodes.map((node) => (
                    <li key={node.id}>
                      <Link
                        href={`/node/${node.id}`}
                        className="group flex items-baseline gap-2 py-[5px] text-[14px] leading-snug"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <span className="group-hover:underline underline-offset-2">
                          {node.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div
              className="mt-14 mb-8 pt-8"
              style={{
                borderTop:
                  "1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)",
              }}
            >
              <p className="text-[13px] text-text-secondary">
                Missing a topic?{" "}
                <Link
                  href="/contribute"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  Contribute a node
                </Link>
                . Read the{" "}
                <Link
                  href="/about"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  editorial standards
                </Link>
                . Apeirron is open source on{" "}
                <a
                  href="https://github.com/theiskaa/apeirron"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  GitHub
                </a>
                .
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
