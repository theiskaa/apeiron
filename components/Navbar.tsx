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
      </div>
    </nav>
  );
}
