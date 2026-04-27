import Navbar from "./Navbar";

interface Volume {
  id: string;
  label: string;
  description: string;
  chapters: number;
}

interface Props {
  volumes: Volume[];
}

// Cover thumbnails are bundled with the site (public/books/) so they
// render fast and don't depend on a github.com round-trip. The PDFs
// and EPUBs themselves are heavy and not bundled — they're fetched
// from GitHub's raw host on click. main is pinned so a renamed
// default branch doesn't silently break every download link.
const RAW_BASE =
  "https://raw.githubusercontent.com/theiskaa/apeirron/main/books";

const coverUrl = (id: string) => `/books/cover-${id}.png`;
const pdfUrl = (id: string) => `${RAW_BASE}/apeirron-${id}.pdf`;
const epubUrl = (id: string) => `${RAW_BASE}/apeirron-${id}.epub`;

export default function BooksView({ volumes }: Props) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-text-primary">
      <Navbar />
      <div className="flex-1 overflow-y-auto panel-scroll">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12 py-8">
          <header className="max-w-[680px] mb-12">
            <h1 className="text-3xl font-bold text-text-primary mb-2 leading-tight">
              Apeirron Series
            </h1>
            <span
              className="inline-block text-xs font-medium mb-6"
              style={{ color: "rgba(144,144,160,0.7)" }}
            >
              Typeset edition
            </span>
            <p className="text-[15px] leading-relaxed text-text-secondary">
              The same content as the apeirron graph, organized into seven
              volumes by category and rendered as standalone books. Each volume
              is available as both EPUB and PDF, downloaded directly from the
              project&rsquo;s GitHub repository — the website stays light, the
              books stay versioned.
            </p>
          </header>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 list-none p-0">
            {volumes.map((volume) => (
              <li key={volume.id} className="flex flex-col">
                <a
                  href={pdfUrl(volume.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-5 transition-transform hover:-translate-y-0.5"
                  aria-label={`Open ${volume.label} PDF`}
                >
                  {/* Plain <img> — Next.js Image would require remotePatterns
                      configuration for raw.githubusercontent.com and the
                      benefit is marginal for static thumbnails. */}
                  <img
                    src={coverUrl(volume.id)}
                    alt={`${volume.label} cover`}
                    width={220}
                    height={330}
                    className="w-full h-auto rounded-sm"
                    style={{
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.12)",
                    }}
                  />
                </a>

                <div className="flex flex-col flex-1">
                  <h2 className="text-base font-semibold text-text-primary mb-1">
                    {volume.label}
                  </h2>
                  <p className="text-[12.5px] leading-snug text-text-secondary mb-1">
                    {volume.description}
                  </p>
                  <span
                    className="text-[11px] mb-4"
                    style={{ color: "rgba(144,144,160,0.7)" }}
                  >
                    {volume.chapters} chapter{volume.chapters === 1 ? "" : "s"}
                  </span>

                  <div className="flex gap-2 mt-auto">
                    <a
                      href={pdfUrl(volume.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chrome inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-full text-[12px] tracking-wide leading-none text-text-secondary hover:text-text-primary"
                    >
                      <DownloadIcon />
                      PDF
                    </a>
                    <a
                      href={epubUrl(volume.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chrome inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-full text-[12px] tracking-wide leading-none text-text-secondary hover:text-text-primary"
                    >
                      <DownloadIcon />
                      EPUB
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div
            className="mt-16 mb-8 pt-8 max-w-[680px]"
            style={{
              borderTop:
                "1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)",
            }}
          >
            <p className="text-[13px] text-text-secondary leading-relaxed">
              The books are derived from the same Markdown source as the graph.
              Every chapter corresponds to a node in{" "}
              <a
                href="https://github.com/theiskaa/apeirron/tree/main/content/nodes"
                target="_blank"
                rel="noopener noreferrer"
              >
                content/nodes/
              </a>
              . The build pipeline lives in{" "}
              <a
                href="https://github.com/theiskaa/apeirron/tree/main/books"
                target="_blank"
                rel="noopener noreferrer"
              >
                books/
              </a>
              . To correct a chapter, edit the source node and open a pull
              request — the typeset output is regenerated, not authored
              independently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
