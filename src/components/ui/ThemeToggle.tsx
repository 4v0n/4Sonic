import Button from "./Button";
import { DarkModeIcon, LightModeIcon } from "../../constants/icons";
import { useThemeContext } from "../../context/ThemeContext";

type ThemeToggleProps = {
  showLabel?: boolean;
  className?: string;
};

const ThemeToggle = ({ showLabel = true, className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useThemeContext();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="medium"
      className={className}
      aria-label="Toggle color theme"
      aria-pressed={isDark}
      icon={isDark ? <LightModeIcon /> : <DarkModeIcon />}
      onClick={toggleTheme}
    >
      {showLabel ? (isDark ? "Light mode" : "Dark mode") : null}
    </Button>
  );
};

export default ThemeToggle;
