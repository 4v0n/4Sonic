import { create } from "zustand";

interface ApiState {
  url: string;
  setUrl: (url: string) => void;

  reqParams: object;
  setAuthParams: (reqParams: object) => void;
}

export const useApiStore = create<ApiState>((set) => ({
  url: "",
  setUrl(url) {
    set({ url });
  },

  reqParams: {},
  setAuthParams(reqParams) {
    set({ reqParams });
  },
}));