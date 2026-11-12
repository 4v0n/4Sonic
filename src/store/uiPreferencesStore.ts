import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToasterProps } from "sonner";

export type ToastPosition = NonNullable<ToasterProps["position"]>;

const DEFAULT_TOAST_POSITION: ToastPosition = "top-right";
const DEFAULT_VISUALIZER_OPACITY = 0.1;
const DEFAULT_VISUALIZER_BLUR = 2;
const DEFAULT_VISUALIZER_HEIGHT = 1;
const DEFAULT_VISUALIZER_RESPONSE = 0.38;
const DEFAULT_VISUALIZER_FPS = 60;

type UiPreferencesState = {
  toastPosition: ToastPosition;
  setToastPosition: (position: ToastPosition) => void;
  visualizerOpacity: number;
  visualizerBlur: number;
  visualizerHeight: number;
  visualizerResponse: number;
  visualizerFps: number;
  setVisualizerOpacity: (opacity: number) => void;
  setVisualizerBlur: (blur: number) => void;
  setVisualizerHeight: (height: number) => void;
  setVisualizerResponse: (response: number) => void;
  setVisualizerFps: (fps: number) => void;
};

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      toastPosition: DEFAULT_TOAST_POSITION,
      setToastPosition: (position) => set({ toastPosition: position }),
      visualizerOpacity: DEFAULT_VISUALIZER_OPACITY,
      visualizerBlur: DEFAULT_VISUALIZER_BLUR,
      visualizerHeight: DEFAULT_VISUALIZER_HEIGHT,
      visualizerResponse: DEFAULT_VISUALIZER_RESPONSE,
      visualizerFps: DEFAULT_VISUALIZER_FPS,
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
      setVisualizerResponse: (response) => {
        const clamped = Math.max(0.05, Math.min(1, response));
        set({ visualizerResponse: clamped });
      },
      setVisualizerFps: (fps) => {
        const clamped = Math.round(Math.max(15, Math.min(120, fps)));
        set({ visualizerFps: clamped });
      },
    }),
    {
      name: "ui-preferences",
    },
  ),
);
