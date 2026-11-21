import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CollectionViewMode = "grid" | "list";

export interface CollectionPreference {
  view?: CollectionViewMode;
  sort?: string;
}

interface CollectionPreferencesState {
  preferences: Record<string, CollectionPreference>;
  setPreference: (key: string, update: CollectionPreference) => void;
}

export const useCollectionPreferencesStore = create<CollectionPreferencesState>()(
  persist(
    (set) => ({
      preferences: {},
      setPreference: (key, update) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: { ...state.preferences[key], ...update } },
        })),
    }),
    { name: "collection-preferences" },
  ),
);

export function useCollectionPreference<K extends keyof CollectionPreference>(
  key: string,
  field: K,
  fallback: NonNullable<CollectionPreference[K]>,
): [NonNullable<CollectionPreference[K]>, (value: NonNullable<CollectionPreference[K]>) => void] {
  const stored = useCollectionPreferencesStore((state) => state.preferences[key]?.[field]);
  const setPreference = useCollectionPreferencesStore((state) => state.setPreference);
  const setValue = useCallback(
    (value: NonNullable<CollectionPreference[K]>) => setPreference(key, { [field]: value }),
    [field, key, setPreference],
  );
  return [(stored ?? fallback) as NonNullable<CollectionPreference[K]>, setValue];
}
