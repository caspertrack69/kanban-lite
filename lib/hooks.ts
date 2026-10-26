"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import {
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getBacklog,
  getBoard,
  getInbox,
  getProjects,
  getSession,
  getSettings,
  getTask,
  login,
  logout,
  updateProject,
  updateSettings,
  updateTask,
} from "./api-client";
import { queryKeys } from "./query-keys";
import type {
  CreateProjectInput,
  CreateTaskInput,
  UpdateProjectInput,
  UpdateTaskInput,
} from "./types";

export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: getSession,
    staleTime: 30_000,
    retry: false,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: getProjects,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: getSettings,
  });
}

export function useBoard() {
  return useQuery({
    queryKey: queryKeys.board,
    queryFn: getBoard,
  });
}

export function useInbox() {
  return useQuery({
    queryKey: queryKeys.inbox,
    queryFn: getInbox,
  });
}

export function useBacklog(projectId: number) {
  return useQuery({
    queryKey: queryKeys.backlog(projectId),
    queryFn: () => getBacklog(projectId),
    enabled: Number.isInteger(projectId) && projectId > 0,
  });
}

export function useTask(id: number | null) {
  return useQuery({
    queryKey: queryKeys.task(id ?? 0),
    queryFn: () => getTask(id as number),
    enabled: id !== null,
  });
}

export function useTaskInvalidation() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    void queryClient.invalidateQueries({ queryKey: queryKeys.taskRoot });
  }, [queryClient]);
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const invalidate = useTaskInvalidation();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const invalidate = useTaskInvalidation();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) =>
      updateTask(id, input),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const invalidate = useTaskInvalidation();

  return useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateProjectInput }) =>
      updateProject(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskRoot });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      void queryClient.invalidateQueries({ queryKey: queryKeys.taskRoot });
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (doingLimit: number) => updateSettings(doingLimit),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      void queryClient.invalidateQueries({ queryKey: queryKeys.board });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => login(password),
    onSuccess: (data) => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.session, data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
