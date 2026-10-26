"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NewTaskDialog, type NewTaskDefaults } from "./new-task-dialog";
import { TaskDetailSheet } from "./task-detail-sheet";

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
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [createDefaults, setCreateDefaults] =
    useState<NewTaskDefaults | undefined>(undefined);

  const openTask = useCallback((id: number) => setActiveTaskId(id), []);
  const closeTask = useCallback(() => setActiveTaskId(null), []);
  const openCreate = useCallback((defaults?: NewTaskDefaults) => {
    setCreateDefaults(defaults);
    setCreateKey((current) => current + 1);
    setCreateOpen(true);
  }, []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  const value = useMemo(
    () => ({
      activeTaskId,
      openTask,
      closeTask,
      openCreate,
      closeCreate,
    }),
    [activeTaskId, closeCreate, closeTask, openCreate, openTask],
  );

  return (
    <TaskUIContext.Provider value={value}>
      {children}
      <NewTaskDialog
        key={createKey}
        open={createOpen}
        defaults={createDefaults}
        onClose={closeCreate}
      />
      <TaskDetailSheet taskId={activeTaskId} onClose={closeTask} />
    </TaskUIContext.Provider>
  );
}
