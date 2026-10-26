import type { AppDatabase } from "../client";
import { listScopePositions } from "../queries/tasks";
import { positionForPlacement, type TaskScope } from "@/lib/ordering";

export async function resolvePosition(
  db: AppDatabase,
  scope: TaskScope,
  input: {
    beforeId?: number | null;
    afterId?: number | null;
    movingId?: number | null;
  },
): Promise<string> {
  const tasks = await listScopePositions(db, scope);
  return positionForPlacement(
    tasks,
    input.movingId ?? null,
    input.beforeId ?? null,
    input.afterId ?? null,
  );
}
