import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const store = new Map<string, unknown>();
const MAX_ENTRIES = 500;

function useHistoryEntryState<T>(id: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const { key, pathname } = useLocation();
  const storeKey = `${key}:${pathname}:${id}`;

  const [value, setValue] = useState<T>(() => {
    if (store.has(storeKey)) return store.get(storeKey) as T;
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    store.delete(storeKey);
    store.set(storeKey, value);
    if (store.size > MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
  }, [storeKey, value]);

  return [value, setValue];
}

export function useHistoryEntryRef<T>(id: string, initial: T): { current: T } {
  const { key, pathname } = useLocation();
  const storeKey = `${key}:${pathname}:ref:${id}`;
  const [ref] = useState<{ current: T }>(() => {
    const existing = store.get(storeKey) as { current: T } | undefined;
    if (existing) return existing;
    const created = { current: initial };
    store.set(storeKey, created);
    return created;
  });
  return ref;
}

export default useHistoryEntryState;
