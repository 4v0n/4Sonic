import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToasterProps } from "sonner";

export type ToastPosition = NonNullable<ToasterProps["position"]>;

const DEFAULT_TOAST_POSITION: ToastPosition = "top-right";
const DEFAULT_VISUALIZER_COLOR = "#12e09f";
const DEFAULT_VISUALIZER_OPACITY = 0.1;
const DEFAULT_VISUALIZER_BLUR = 2;
const DEFAULT_VISUALIZER_HEIGHT = 1;

const getThemePrimaryColor = (): string => {
  if (typeof window === "undefined") return DEFAULT_VISUALIZER_COLOR;
  const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary0").trim();
  return primary || DEFAULT_VISUALIZER_COLOR;
};

type UiPreferencesState = {
  toastPosition: ToastPosition;
  setToastPosition: (position: ToastPosition) => void;
  visualizerColor: string;
  visualizerOpacity: number;
  visualizerBlur: number;
  visualizerHeight: number;
  setVisualizerColor: (color: string) => void;
  setVisualizerOpacity: (opacity: number) => void;
  setVisualizerBlur: (blur: number) => void;
  setVisualizerHeight: (height: number) => void;
};

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      toastPosition: DEFAULT_TOAST_POSITION,
      setToastPosition: (position) => set({ toastPosition: position }),
      visualizerColor: getThemePrimaryColor(),
      visualizerOpacity: DEFAULT_VISUALIZER_OPACITY,
      visualizerBlur: DEFAULT_VISUALIZER_BLUR,
      visualizerHeight: DEFAULT_VISUALIZER_HEIGHT,
      setVisualizerColor: (color) => set({ visualizerColor: color }),
      setVisualizerOpacity: (opacity) => {
        const clamped = Math.max(0, Math.min(1, opacity));
        set({ visualizerOpacity: clamped });
      },
      setVisualizerBlur: (blur) => {
        const clamped = Math.max(0, Math.min(30, blur));
        set({ visualizerBlur: clamped });
      },
      setVisualizerHeight: (height) => {
        const clamped = Math.max(0, Math.min(1, height));
        set({ visualizerHeight: clamped });
      },
    }),
    {
      name: "ui-preferences",
    },
  ),
);
