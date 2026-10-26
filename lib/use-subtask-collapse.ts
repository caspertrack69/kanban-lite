"use client";

import { useCallback, useSyncExternalStore } from "react";
import { SUBTASK_COLLAPSE_STORAGE_PREFIX } from "@/lib/constants";

const listeners = new Set<() => void>();
const memoryFallback = new Map<string, string>();

function emitChange() {
  for (const listener of listeners) listener();
}

function readValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memoryFallback.get(key) ?? null;
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function writeValue(key: string, value: string) {
  memoryFallback.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode may reject storage; the in-memory fallback still works.
  }
}

export function useSubtaskCollapse(taskId: number) {
  const key = `${SUBTASK_COLLAPSE_STORAGE_PREFIX}${taskId}`;

  const subscribe = useCallback(
    (listener: () => void) => {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => readValue(key) === "1", [key]);

  const expanded = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = useCallback(() => {
    writeValue(key, getSnapshot() ? "0" : "1");
    emitChange();
  }, [getSnapshot, key]);

  return { expanded, toggle };
}
