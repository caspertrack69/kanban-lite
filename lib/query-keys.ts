export const queryKeys = {
  session: ["session"] as const,
  projects: ["projects"] as const,
  settings: ["settings"] as const,
  tasks: ["tasks"] as const,
  board: ["tasks", "board"] as const,
  inbox: ["tasks", "inbox"] as const,
  backlog: (projectId: number) => ["tasks", "backlog", projectId] as const,
  taskRoot: ["task"] as const,
  task: (id: number) => ["task", id] as const,
};
