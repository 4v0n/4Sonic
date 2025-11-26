import { create } from "zustand";

export type RightSidebarView = "queue";

const RIGHT_SIDEBAR_DEFAULT_WIDTH = 320;

interface RightSidebarState {
  isOpen: boolean;
  view: RightSidebarView;
  width: number;
  open: (view?: RightSidebarView) => void;
  close: () => void;
  toggle: (view?: RightSidebarView) => void;
  setWidth: (width: number | ((prev: number) => number)) => void;
}

export const useRightSidebarStore = create<RightSidebarState>((set) => ({
  isOpen: false,
  view: "queue",
  width: RIGHT_SIDEBAR_DEFAULT_WIDTH,
  open: (view = "queue") => set({ isOpen: true, view }),
  close: () => set({ isOpen: false }),
  toggle: (view = "queue") =>
    set((state) => {
      if (state.isOpen && state.view === view) {
        return { isOpen: false };
      }
      return { isOpen: true, view };
    }),
  setWidth: (width) =>
    set((state) => ({
      width: typeof width === "function" ? width(state.width) : width,
    })),
}));

export const openQueueSidebar = (): void => {
  useRightSidebarStore.getState().open("queue");
};
