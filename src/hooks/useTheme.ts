import { useState, useEffect } from "react";

type ThemeMode = "light" | "dark";

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem("theme") === "light" ? "light" : "dark"));

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return {theme, toggleTheme};
};
