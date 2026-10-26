import type { BoardStatus, TaskStatus } from "./constants";

export type ProjectSummary = {
  id: number;
  name: string;
  color: string;
};

export type ProjectDTO = ProjectSummary & {
  createdAt: number;
  taskCount: number;
};

export type TaskDTO = {
  id: number;
  projectId: number | null;
  parentId: number | null;
  title: string;
  note: string | null;
  status: TaskStatus | null;
  position: string;
  createdAt: number;
  updatedAt: number;
  doneAt: number | null;
  project: ProjectSummary | null;
  subtasks: TaskDTO[];
};

export type BoardData = {
  columns: Record<BoardStatus, TaskDTO[]>;
  doingLimit: number;
  doneSince: number;
};

export type TaskListData = {
  tasks: TaskDTO[];
};

export type SettingsData = {
  doingLimit: number;
  doingCount: number;
};

export type SessionState = {
  authenticated: boolean;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export type CreateTaskInput = {
  title: string;
  note?: string | null;
  status?: TaskStatus;
  projectId?: number | null;
  parentId?: number | null;
  beforeId?: number | null;
  afterId?: number | null;
};

export type UpdateTaskInput = {
  title?: string;
  note?: string | null;
  status?: TaskStatus;
  projectId?: number | null;
  parentId?: number | null;
  beforeId?: number | null;
  afterId?: number | null;
  completed?: boolean;
};

export type CreateProjectInput = {
  name: string;
  color: string;
};

export type UpdateProjectInput = {
  name?: string;
  color?: string;
};
