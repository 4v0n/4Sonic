import { createContext, useContext, type ReactNode } from "react";
import { useTheme } from "../hooks/useTheme";
import { ThemeName, THEME_OPTIONS } from "../constants/themes";

type ThemeContextValue = {
  theme: ThemeName;
  themes: typeof THEME_OPTIONS;
  setTheme: (theme: ThemeName) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const themeState = useTheme();

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
