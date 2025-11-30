import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";
import { ThemeName, THEME_OPTIONS } from "../constants/themes";
import { useUiPreferencesStore } from "../store/uiPreferencesStore";

type ThemeContextValue = {
  theme: ThemeName;
  themes: typeof THEME_OPTIONS;
  setTheme: (theme: ThemeName) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const themeState = useTheme();
  const setVisualizerColor = useUiPreferencesStore((state) => state.setVisualizerColor);
  const lastThemeRef = useRef<ThemeName | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary0").trim();
    if (primary && lastThemeRef.current !== themeState.theme) {
      setVisualizerColor(primary);
    }
    lastThemeRef.current = themeState.theme;
  }, [setVisualizerColor, themeState.theme]);

  return (
    <ThemeContext.Provider value={themeState}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }

  return context;
};
