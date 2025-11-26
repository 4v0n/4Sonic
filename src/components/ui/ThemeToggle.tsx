import { useThemeContext } from "../../context/ThemeContext";
import Select from "./Select";
import { ThemeName } from "../../constants/themes";

type ThemeToggleProps = {
  showLabel?: boolean;
  className?: string;
};

const ThemeToggle = ({ showLabel = true, className }: ThemeToggleProps) => {
  const { theme, setTheme, themes } = useThemeContext();
  const activeLabel = themes.find((option) => option.id === theme)?.label ?? theme;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {showLabel ? <span className="text-sm font-medium text-(--text)">Theme</span> : null}
      <Select
        aria-label="Select color theme"
        fullWidth={false}
        size="small"
        value={theme}
        onValueChange={(value) => setTheme(value as ThemeName)}
        options={themes.map(({ id, label }) => ({ label, value: id }))}
      />
      {showLabel ? <span className="text-xs text-(--text-grey)">Now: {activeLabel}</span> : null}
    </div>
  );
};

export default ThemeToggle;
