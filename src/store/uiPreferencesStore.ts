import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToasterProps } from "sonner";

export type ToastPosition = NonNullable<ToasterProps["position"]>;

const DEFAULT_TOAST_POSITION: ToastPosition = "top-right";

type UiPreferencesState = {
  toastPosition: ToastPosition;
  setToastPosition: (position: ToastPosition) => void;
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
