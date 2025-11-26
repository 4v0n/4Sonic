import { create } from "zustand";
import { SubsonicClient, SubsonicCredentials } from "../services/subsonic/client";
import { createSalt, createTokenFromPassword, normalizeServerUrl } from "../services/subsonic/auth";
import { clearLibrarySnapshot } from "../db/libraryDb";
import { useLibraryStore } from "./libraryStore";

const AUTH_STORAGE_KEY = "four-sonic.auth";
const DEFAULT_SERVER_URL = (import.meta.env.VITE_DEFAULT_SERVER_URL ?? "").trim();

export interface LoginPayload {
  serverUrl: string;
  username: string;
  password: string;
  stayLoggedIn: boolean;
}

interface PersistedCredentials extends SubsonicCredentials {
  stayLoggedIn: boolean;
}

interface AuthSession {
  client: SubsonicClient;
  credentials: PersistedCredentials;
}

type AuthStatus = "idle" | "authenticating" | "ready" | "error";

interface AuthState {
  session: AuthSession | null;
  status: AuthStatus;
  error?: string;
  isHydrated: boolean;
  hydrateFromStorage: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const persistCredentials = (credentials: PersistedCredentials | null): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (credentials && credentials.stayLoggedIn) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(credentials));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

const readPersistedCredentials = (): PersistedCredentials | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as PersistedCredentials;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

const createSession = (credentials: PersistedCredentials): AuthSession => ({
  client: new SubsonicClient(credentials),
  credentials,
});

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  status: "idle",
  error: undefined,
  isHydrated: false,
  hydrateFromStorage: async () => {
    if (get().isHydrated) {
      return;
    }

    const persisted = readPersistedCredentials();
    if (!persisted) {
      set({ isHydrated: true, status: "idle", error: undefined, session: null });
      return;
    }

    try {
      set({ status: "authenticating", error: undefined });
      const session = createSession(persisted);
      await session.client.ping();
      set({
        session,
        status: "ready",
        error: undefined,
        isHydrated: true,
      });
    } catch (error) {
      persistCredentials(null);
      set({
        session: null,
        status: "idle",
        error: error instanceof Error ? error.message : "Unable to restore session",
        isHydrated: true,
      });
    }
  },
  login: async ({ serverUrl, username, password, stayLoggedIn }) => {
    set({ status: "authenticating", error: undefined });

    const resolvedServerUrl = serverUrl.trim() || DEFAULT_SERVER_URL;
    if (!resolvedServerUrl) {
      const message = "Server URL is required";
      set({ status: "error", error: message });
      throw new Error(message);
    }

    const normalizedServer = normalizeServerUrl(resolvedServerUrl);
    const salt = createSalt();
    const token = createTokenFromPassword(password, salt);
    const credentials: PersistedCredentials = {
      serverUrl: normalizedServer,
      username: username.trim(),
      token,
      salt,
      clientName: "four-sonic-app",
      stayLoggedIn,
    };

    try {
      const session = createSession(credentials);
      await session.client.ping();
      persistCredentials(stayLoggedIn ? credentials : null);
      set({
        session,
        status: "ready",
        isHydrated: true,
        error: undefined,
      });
    } catch (error) {
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Unable to authenticate",
      });
      throw error;
    }
  },
  logout: async () => {
    persistCredentials(null);
    await clearLibrarySnapshot();
    useLibraryStore.getState().reset();
    set({
      session: null,
      status: "idle",
      error: undefined,
      isHydrated: true,
    });
  },
}));
