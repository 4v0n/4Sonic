import { Toaster } from "sonner";
import { useThemeContext } from "../../context/ThemeContext";
import { useUiPreferencesStore } from "../../store/uiPreferencesStore";

const Sonner = () => {
  const { theme } = useThemeContext();
  const toastPosition = useUiPreferencesStore((state) => state.toastPosition);
  const isLightTheme = theme === "light" || theme === "sakura";

  return (
    <Toaster
      position={toastPosition}
      theme={isLightTheme ? "light" : "dark"}
      richColors
      duration={1500}
      swipeDirections={["left", "right", "top", "bottom"]}
      toastOptions={{
        className: "border border-(--surface2) bg-(--surface1) text-(--text) shadow-lg relative pr-12",
        classNames: {
          closeButton: "absolute right-2 top-2 h-8 w-8 cursor-pointer rounded-full border border-(--surface2) bg-(--surface0) text-(--text) shadow hover:bg-(--surface1) hover:shadow-md flex items-center justify-center transition-colors",
        },
        style: {
          backgroundColor: "var(--surface1)",
          color: "var(--text)",
          borderColor: "var(--surface2)",
        },
      }}
    />
  );
};

export default Sonner;
