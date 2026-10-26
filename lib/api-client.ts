import type {
  BoardData,
  CreateProjectInput,
  CreateTaskInput,
  ProjectDTO,
  SessionState,
  SettingsData,
  TaskDTO,
  TaskListData,
  UpdateProjectInput,
  UpdateTaskInput,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function readError(response: Response): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const error = (payload as { error?: { code?: string; message?: string } })
    ?.error;

  return new ApiError(
    response.status,
    error?.code ?? "REQUEST_FAILED",
    error?.message ?? `Request failed (${response.status}).`,
  );
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await readError(response);
    if (
      response.status === 401 &&
      !path.startsWith("/api/auth/") &&
      typeof window !== "undefined"
    ) {
      window.location.replace("/login");
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export function getSession(): Promise<SessionState> {
  return apiFetch<SessionState>("/api/auth/session");
}

export function login(password: string): Promise<SessionState> {
  return apiFetch<SessionState>("/api/auth/login", {
    method: "POST",
    body: jsonBody({ password }),
  });
}

export function logout(): Promise<SessionState> {
  return apiFetch<SessionState>("/api/auth/logout", { method: "POST" });
}

export async function getProjects(): Promise<ProjectDTO[]> {
  const data = await apiFetch<{ projects: ProjectDTO[] }>("/api/projects");
  return data.projects;
}

export function createProject(input: CreateProjectInput): Promise<ProjectDTO> {
  return apiFetch<ProjectDTO>("/api/projects", {
    method: "POST",
    body: jsonBody(input),
  });
}

export function updateProject(
  id: number,
  input: UpdateProjectInput,
): Promise<ProjectDTO> {
  return apiFetch<ProjectDTO>(`/api/projects/${id}`, {
    method: "PATCH",
    body: jsonBody(input),
  });
}

export function deleteProject(
  id: number,
): Promise<{ deletedTaskCount: number }> {
  return apiFetch<{ deletedTaskCount: number }>(`/api/projects/${id}`, {
    method: "DELETE",
  });
}

export function getBoard(): Promise<BoardData> {
  return apiFetch<BoardData>("/api/tasks?view=board");
}

export async function getInbox(): Promise<TaskListData> {
  return apiFetch<TaskListData>("/api/tasks?view=inbox");
}

export async function getBacklog(projectId: number): Promise<TaskListData> {
  return apiFetch<TaskListData>(
    `/api/tasks?view=backlog&projectId=${projectId}`,
  );
}

export function createTask(input: CreateTaskInput): Promise<TaskDTO> {
  return apiFetch<TaskDTO>("/api/tasks", {
    method: "POST",
    body: jsonBody(input),
  });
}

export function getTask(id: number): Promise<TaskDTO> {
  return apiFetch<TaskDTO>(`/api/tasks/${id}`);
}

export function updateTask(
  id: number,
  input: UpdateTaskInput,
): Promise<TaskDTO> {
  return apiFetch<TaskDTO>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: jsonBody(input),
  });
}

export function deleteTask(
  id: number,
): Promise<{ deletedSubtaskCount: number }> {
  return apiFetch<{ deletedSubtaskCount: number }>(`/api/tasks/${id}`, {
    method: "DELETE",
  });
}

export function getSettings(): Promise<SettingsData> {
  return apiFetch<SettingsData>("/api/settings");
}

export function updateSettings(doingLimit: number): Promise<SettingsData> {
  return apiFetch<SettingsData>("/api/settings", {
    method: "PATCH",
    body: jsonBody({ doingLimit }),
  });
}
