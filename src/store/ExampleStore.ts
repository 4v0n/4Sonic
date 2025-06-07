import { create } from "zustand";

interface ExampleState {
  state: boolean;
  setState: (newState: boolean) => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  state: false,
  setState: (newState: boolean) => set({ state: newState }),
}));