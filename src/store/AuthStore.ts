import { create } from "zustand";
import { ping } from "../services/navidrome";
import md5 from "../utils/md5";

interface AuthState {
  serverUrl: string;
  username: string;
  token: string;
  salt: string;
  isLoggedIn: boolean;
  setCredentials: (serverUrl: string, username: string, token: string, salt: string) => void;
  login: (serverUrl: string, username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  serverUrl: "",
  username: "",
  token: "",
  salt: "",
  isLoggedIn: false,

  setCredentials: (serverUrl, username, token, salt) => {
    localStorage.setItem(
      "auth",
      JSON.stringify({ serverUrl, username, token, salt }),
    );
    set({ serverUrl, username, token, salt, isLoggedIn: true });
  },

  login: async (serverUrl, username, password) => {
    const salt = Math.random().toString(36).slice(2, 8);
    const token = md5(password + salt);
    try {
      await ping(serverUrl, username, token, salt);
      get().setCredentials(serverUrl, username, token, salt);
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem("auth");
    set({ serverUrl: "", username: "", token: "", salt: "", isLoggedIn: false });
  },

  loadFromStorage: async () => {
    const stored = localStorage.getItem("auth");
    if (!stored) return;
    try {
      const { serverUrl, username, token, salt } = JSON.parse(stored);
      await ping(serverUrl, username, token, salt);
      set({ serverUrl, username, token, salt, isLoggedIn: true });
    } catch {
      localStorage.removeItem("auth");
      set({ serverUrl: "", username: "", token: "", salt: "", isLoggedIn: false });
    }
  },
}));

