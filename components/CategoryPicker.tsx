"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Category } from "@/lib/types";

interface Props {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}

const PRESET_COLORS = [
  // existing category colors
  "#9683b7", "#b89458", "#6790b5", "#b5616a",
  "#c4855c", "#a87f98", "#549e93",
  // warm
  "#d4836a", "#c9956b", "#b07a5b", "#c47878",
  // cool
  "#7b8fb2", "#6b9e9e", "#5b8ea0", "#8a9e6b",
  // muted
  "#a08cb0", "#8e7c99", "#7a9488", "#9b8a7a",
  // vibrant
  "#c2735e", "#7c6dab", "#5c9ea8", "#a0704f",
];

export default function CategoryPicker({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customColor, setCustomColor] = useState(PRESET_COLORS[7]);
  const [showNewForm, setShowNewForm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCustom = value.startsWith("custom:");
  const selectedCat = categories.find((c) => c.id === value);
  // Custom format: "custom:Name:#hexcolor"
  const customParts = isCustom ? value.slice(7).split(":") : [];
  const displayLabel = isCustom
    ? customParts[0]
    : selectedCat?.label ?? "";
  const displayColor = isCustom
    ? (customParts[1] || customColor)
    : selectedCat?.color ?? "var(--text-muted)";

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when showing new form
  useEffect(() => {
    if (showNewForm) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [showNewForm]);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setShowNewForm(false);
    },
    [onChange]
  );

  const handleCreateCustom = useCallback(() => {
    if (!customName.trim()) return;
    onChange("custom:" + customName.trim() + ":" + customColor);
    setOpen(false);
    setShowNewForm(false);
    setCustomName("");
  }, [customName, onChange]);

  return (
    <div ref={ref} className="relative inline-block mb-3">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 group"
      >
        {value && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: displayColor }}
          />
        )}
        <span
          className="text-xs font-medium"
          style={{ color: value ? displayColor : "var(--text-muted)" }}
        >
          {value ? displayLabel : "Select category..."}
        </span>
        <svg
          className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-56 bg-[var(--surface)] rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 ring-1 ring-black/[0.06] dark:ring-white/[0.08] overflow-hidden"
        >
          {!showNewForm ? (
            <>
              <div className="py-1.5 px-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-xl ${
                      value === c.id
                        ? "bg-black/[0.04] dark:bg-white/[0.06]"
                        : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-[13px] text-text-primary">
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="px-3 pb-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-dashed"
                  style={{ borderColor: "rgba(144,144,160,0.2)" }}
                >
                  <svg
                    className="w-3 h-3 text-text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-[13px] text-text-muted">
                    New category
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
                  Name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCustom();
                    }
                    if (e.key === "Escape") {
                      setShowNewForm(false);
                    }
                  }}
                  placeholder="e.g. Technology"
                  className="w-full rounded-full px-3.5 py-1.5 text-[13px] bg-background border border-black/[0.06] dark:border-white/[0.08] text-text-primary placeholder:text-text-muted/40 outline-none focus:ring-1 focus:ring-black/[0.1] dark:focus:ring-white/[0.12]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
                  Color
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCustomColor(color)}
                      className="w-5 h-5 rounded-full transition-transform"
                      style={{
                        backgroundColor: color,
                        transform: customColor === color ? "scale(1.25)" : "scale(1)",
                        boxShadow:
                          customColor === color
                            ? `0 0 0 2px var(--surface), 0 0 0 3.5px ${color}`
                            : "none",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCreateCustom}
                  disabled={!customName.trim()}
                  className="flex-1 rounded-lg py-1.5 text-[12px] font-medium transition-colors disabled:opacity-30"
                  style={{
                    backgroundColor: customColor,
                    color: "#fff",
                  }}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="rounded-lg py-1.5 px-3 text-[12px] text-text-muted hover:text-text-secondary transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
