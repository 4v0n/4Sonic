import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToasterProps } from "sonner";

const DEFAULT_TOAST_POSITION: ToasterProps["position"] = "top-right";

type UiPreferencesState = {
  toastPosition: ToasterProps["position"];
  setToastPosition: (position: ToasterProps["position"]) => void;
};

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      toastPosition: DEFAULT_TOAST_POSITION,
      setToastPosition: (position) => set({ toastPosition: position }),
    }),
    {
      name: "ui-preferences",
    },
  ),
);
