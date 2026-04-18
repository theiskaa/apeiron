export type ThemeId = "light" | "dark" | "warm" | "black";

export interface ThemeDef {
  id: ThemeId;
  label: string;
}

export const THEMES: ThemeDef[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "warm", label: "Warm" },
  { id: "black", label: "Black" },
];

export const DEFAULT_THEME: ThemeId = "light";
export const THEME_STORAGE_KEY = "theme";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((t) => t.id === value);
}

export function applyTheme(id: ThemeId): void {
  const root = document.documentElement;
  for (const t of THEMES) root.classList.remove(t.id);
  if (id !== "light") root.classList.add(id);
}

export function getStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
