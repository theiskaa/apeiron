"use client";

import ThemeToggle from "./ThemeToggle";

interface Props {
  onLogoClick?: () => void;
  onSearchClick?: () => void;
}

export default function Navbar({ onLogoClick, onSearchClick }: Props) {
  return (
    <nav className="relative z-10 flex items-center justify-between px-3 md:px-8 pt-10 md:pt-7 pb-4 shrink-0">
      <button
        onClick={onLogoClick}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="flex flex-col text-left">
          <span className="text-[15px] font-semibold tracking-[0.14em] text-text-primary leading-tight capitalize">
            Apeirron
          </span>
          <span className="text-[10px] text-text-muted tracking-[0.06em]">
            Biggest questions humanity asks
          </span>
        </div>
      </button>
      <div className="flex items-center gap-4">
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-text-muted hover:text-text-secondary transition-all text-[11px] tracking-wide leading-none"
            style={{
              backgroundColor: "color-mix(in srgb, var(--text-primary) 5%, transparent)",
              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 10%, transparent)",
            }}
            aria-label="Search nodes"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline text-[10px] text-text-muted/70 ml-1">⌘K</kbd>
          </button>
        )}
        <a
          href="/contribute"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-text-muted hover:text-text-secondary transition-all text-[11px] tracking-wide leading-none"
          style={{
            backgroundColor: "color-mix(in srgb, var(--text-primary) 5%, transparent)",
            boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 10%, transparent)",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="hidden sm:inline">New Node</span>
        </a>
        <ThemeToggle />
        <a
          href="https://github.com/theiskaa/apeirron"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="GitHub repository"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </div>
    </nav>
  );
}
