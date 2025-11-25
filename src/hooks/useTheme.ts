import { useState, useEffect } from "react";
import { DEFAULT_THEME, ThemeName, THEME_OPTIONS } from "../constants/themes";

const STORAGE_KEY = "theme";

const getStoredTheme = (): ThemeName => {
  const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const fallback = DEFAULT_THEME;

  if (!saved) {
    return fallback;
  }

  return THEME_OPTIONS.some((theme) => theme.id === saved) ? (saved as ThemeName) : fallback;
};

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme());

  useEffect(() => {
    const root = window.document.documentElement;

    root.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prevTheme) => {
      const currentIndex = THEME_OPTIONS.findIndex((option) => option.id === prevTheme);
      const next = THEME_OPTIONS[(currentIndex + 1) % THEME_OPTIONS.length];
      return next?.id ?? DEFAULT_THEME;
    });
  };

  return {theme, setTheme, cycleTheme, themes: THEME_OPTIONS};
};
