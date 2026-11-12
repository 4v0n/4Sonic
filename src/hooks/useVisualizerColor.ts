import { useEffect, useState } from "react";
import { usePlaybackStore } from "../store/playbackStore";
import { hslToHex, MIN_THEME_SATURATION } from "../utils/imageColor";
import useImageAccentColor from "./useImageAccentColor";

const FALLBACK_COLOR = "#12e09f";

const DARK_SCHEME_LIGHTNESS = 55;
const LIGHT_SCHEME_LIGHTNESS = 40;

interface ThemeColors {
  primary: string;
  isDark: boolean;
}

const readThemeColors = (): ThemeColors => {
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue("--color-primary0").trim() || FALLBACK_COLOR,
    isDark: styles.colorScheme !== "light",
  };
};

const useThemeColors = (): ThemeColors => {
  const [colors, setColors] = useState(readThemeColors);

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(readThemeColors()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    setColors(readThemeColors());
    return () => observer.disconnect();
  }, []);

  return colors;
};

const useVisualizerColor = (): string => {
  const { primary, isDark } = useThemeColors();
  const coverArtUrl = usePlaybackStore((state) => state.coverArtUrl);
  const accent = useImageAccentColor(coverArtUrl);

  if (!accent || accent.s < MIN_THEME_SATURATION) return primary;
  return hslToHex({ ...accent, l: isDark ? DARK_SCHEME_LIGHTNESS : LIGHT_SCHEME_LIGHTNESS });
};

export default useVisualizerColor;
