import { create } from "zustand";

interface ApiState {
  url: string;
  setUrl: (url: string) => void;
}

export const useApiStore = create<ApiState>((set) => ({
  url: "",
  setUrl(url) {
    set({ url });
  },
}));