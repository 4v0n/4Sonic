import { useEffect, useRef, useState } from "react";
import { DEFAULT_THEME, ThemeName, THEME_OPTIONS } from "../constants/themes";

const THEME_TRANSITION_MS = 320;

const STORAGE_KEY = "theme";

const getSystemTheme = (): ThemeName => {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
};

const getStoredTheme = (): ThemeName => {
  const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const fallback = getSystemTheme();

  if (!saved) {
    return fallback;
  }

  return THEME_OPTIONS.some((theme) => theme.id === saved) ? (saved as ThemeName) : fallback;
};

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme());
  const hasMounted = useRef(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const transitionClass = "theme-transition";

    root.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);

    if (hasMounted.current) {
      root.classList.add(transitionClass);
      const timer = window.setTimeout(() => root.classList.remove(transitionClass), THEME_TRANSITION_MS);
      return () => window.clearTimeout(timer);
    }

    hasMounted.current = true;
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setTheme(event.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const cycleTheme = () => {
    setTheme((prevTheme) => {
      const currentIndex = THEME_OPTIONS.findIndex((option) => option.id === prevTheme);
      const next = THEME_OPTIONS[(currentIndex + 1) % THEME_OPTIONS.length];
      return next?.id ?? DEFAULT_THEME;
    });
  };

  return { theme, setTheme, cycleTheme, themes: THEME_OPTIONS };
};
