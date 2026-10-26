"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { TaskStatus } from "@/lib/constants";

export type NewTaskDefaults = {
  status?: TaskStatus;
  projectId?: number | null;
};

type TaskUIValue = {
  activeTaskId: number | null;
  openTask: (id: number) => void;
  closeTask: () => void;
  openCreate: (defaults?: NewTaskDefaults) => void;
  closeCreate: () => void;
};

const TaskUIContext = createContext<TaskUIValue | null>(null);

export function useTaskUI(): TaskUIValue {
  const value = useContext(TaskUIContext);
  if (!value) {
    throw new Error("useTaskUI must be used inside TaskUIProvider.");
  }
  return value;
}

export function TaskUIProvider({ children }: { children: ReactNode }) {
  const value = useMemo<TaskUIValue>(
    () => ({
      activeTaskId: null,
      openTask: () => undefined,
      closeTask: () => undefined,
      openCreate: () => undefined,
      closeCreate: () => undefined,
    }),
    [],
  );

  return (
    <TaskUIContext.Provider value={value}>
      {children}
    </TaskUIContext.Provider>
  );
}
