export type ThemeName = "dark" | "light" | "nord" | "sakura" | "sakura-dark" | "ocean";

export type ThemeOption = {
  id: ThemeName;
  label: string;
};

export const DEFAULT_THEME: ThemeName = "dark";

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "nord", label: "Nord" },
  { id: "sakura", label: "Sakura" },
  { id: "sakura-dark", label: "Sakura Dark" },
  { id: "ocean", label: "Ocean Breeze" },
];
