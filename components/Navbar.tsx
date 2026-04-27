"use client";

import Link from "next/link";
import Logo from "./Logo";
import ThemePicker from "./ThemePicker";

interface Props {
  onLogoClick?: () => void;
  onSearchClick?: () => void;
}

export default function Navbar({ onLogoClick, onSearchClick }: Props) {
  const logoContent = <Logo className="text-text-primary" height={26} />;

  return (
    <nav className="relative z-10 flex items-center justify-between px-4 md:px-8 pt-12 md:pt-0 h-24 md:h-16 shrink-0">
      <Link
        href="/"
        prefetch={false}
        onClick={
          onLogoClick
            ? (e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onLogoClick();
              }
            : undefined
        }
        className="flex items-center gap-3 rounded-lg px-1 -mx-1 hover:opacity-80 transition-opacity"
      >
        {logoContent}
      </Link>
      <div className="flex items-center gap-1.5 md:gap-2">
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="chrome h-8 w-8 sm:w-auto inline-flex items-center justify-center sm:gap-2 sm:px-3 rounded-full text-text-secondary hover:text-text-primary text-[12px] tracking-wide leading-none"
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
            <kbd className="hidden md:inline text-[10px] text-text-muted ml-1 font-sans">⌘K</kbd>
          </button>
        )}
        <Link
          href="/contribute"
          className="chrome h-8 w-8 sm:w-auto inline-flex items-center justify-center sm:gap-1.5 sm:px-3 rounded-full text-text-secondary hover:text-text-primary text-[12px] tracking-wide leading-none"
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
        </Link>
        <Link
          href="/books"
          className="chrome h-8 w-8 sm:w-auto inline-flex items-center justify-center sm:gap-1.5 sm:px-3 rounded-full text-text-secondary hover:text-text-primary text-[12px] tracking-wide leading-none"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className="hidden sm:inline">Books</span>
        </Link>
        <ThemePicker />
        <Link
          href="/about"
          aria-label="About Apeirron"
          className="chrome h-8 w-8 inline-flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </Link>
        <a
          href="https://github.com/theiskaa/apeirron"
          target="_blank"
          rel="noopener noreferrer"
          className="chrome h-8 w-8 inline-flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
          aria-label="GitHub repository"
        >
          <svg
            width="15"
            height="15"
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
