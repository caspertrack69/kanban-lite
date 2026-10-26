import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./test-utils";
import {
  createProject,
  deleteProject,
  listProjectsService,
  updateProject,
} from "./services/projects";
import { createTask, deleteTask, getBoardData, updateTask } from "./services/tasks";
import { getDoingLimit, setDoingLimit } from "./queries/settings";
import { listBoardTasks, getTaskDetail } from "./queries/tasks";
import { PROJECT_COLORS } from "@/lib/design-tokens.generated";
import { AppError } from "@/lib/errors";

const COLOR = PROJECT_COLORS[0];
const NOW = Date.UTC(2026, 1, 20, 12, 0, 0);
const DAY = 86_400_000;

let database: TestDatabase;

beforeEach(async () => {
  database = await createTestDatabase();
});

afterEach(() => {
  database.close();
});

async function project(name = "Alpha") {
  return createProject(database.db, { name, color: COLOR }, NOW);
}

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error(`Expected error ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  }
}

describe("projects", () => {
  it("rejects case-insensitive duplicate names", async () => {
    await project("Alpha");
    await expectCode(project("alpha"), "PROJECT_NAME_TAKEN");
    expect(await listProjectsService(database.db)).toHaveLength(1);
  });

  it("rejects duplicate names on rename too", async () => {
    const alpha = await project("Alpha");
    await project("Beta");
    await expectCode(
      updateProject(database.db, alpha.id, { name: "beta" }),
      "PROJECT_NAME_TAKEN",
    );
  });

  it("deletes project tasks and subtasks with a count", async () => {
    const alpha = await project("Alpha");
    const parent = await createTask(
      database.db,
      { title: "Parent", status: "backlog", projectId: alpha.id },
      NOW,
    );
    const subtask = await createTask(
      database.db,
      { title: "Subtask", parentId: parent.id },
      NOW,
    );
    const todo = await createTask(
      database.db,
      { title: "Todo", status: "todo", projectId: alpha.id },
      NOW,
    );

    const result = await deleteProject(database.db, alpha.id);
    expect(result.deletedTaskCount).toBe(3);
    expect(await getTaskDetail(database.db, parent.id)).toBeUndefined();
    expect(await getTaskDetail(database.db, subtask.id)).toBeUndefined();
    expect(await getTaskDetail(database.db, todo.id)).toBeUndefined();
    expect(await listProjectsService(database.db)).toEqual([]);
  });
});

describe("task lifecycle", () => {
  it("deletes a parent together with its subtasks", async () => {
    const alpha = await project();
    const parent = await createTask(
      database.db,
      { title: "Parent", status: "todo", projectId: alpha.id },
      NOW,
    );
    await createTask(database.db, { title: "A", parentId: parent.id }, NOW);
    await createTask(database.db, { title: "B", parentId: parent.id }, NOW);

    const result = await deleteTask(database.db, parent.id);
    expect(result.deletedSubtaskCount).toBe(2);
    expect(await getTaskDetail(database.db, parent.id)).toBeUndefined();
  });

  it("sets and clears doneAt across status changes", async () => {
    const alpha = await project();
    const task = await createTask(
      database.db,
      { title: "Task", status: "todo", projectId: alpha.id },
      NOW,
    );

    const doing = await updateTask(database.db, task.id, { status: "doing" }, NOW + 1);
    expect(doing.status).toBe("doing");
    expect(doing.doneAt).toBeNull();

    const done = await updateTask(database.db, task.id, { status: "done" }, NOW + 2);
    expect(done.doneAt).toBe(NOW + 2);

    const renamed = await updateTask(database.db, task.id, { title: "Renamed" }, NOW + 3);
    expect(renamed.title).toBe("Renamed");
    expect(renamed.doneAt).toBe(NOW + 2);

    const reopened = await updateTask(database.db, task.id, { status: "todo" }, NOW + 4);
    expect(reopened.doneAt).toBeNull();
  });

  it("treats created done tasks as completed now", async () => {
    const alpha = await project();
    const task = await createTask(
      database.db,
      { title: "Already done", status: "done", projectId: alpha.id },
      NOW,
    );
    expect(task.doneAt).toBe(NOW);
  });

  it("copies project changes to subtasks and clears them for inbox", async () => {
    const alpha = await project("Alpha");
    const beta = await project("Beta");
    const parent = await createTask(
      database.db,
      { title: "Parent", status: "backlog", projectId: alpha.id },
      NOW,
    );
    const subtask = await createTask(
      database.db,
      { title: "Subtask", parentId: parent.id },
      NOW,
    );
    expect(subtask.projectId).toBe(alpha.id);
    expect(subtask.status).toBeNull();

    const moved = await updateTask(
      database.db,
      parent.id,
      { projectId: beta.id },
      NOW + 1,
    );
    const movedSubtask = await getTaskDetail(database.db, subtask.id);
    expect(moved.projectId).toBe(beta.id);
    expect(movedSubtask?.projectId).toBe(beta.id);

    const inboxed = await updateTask(
      database.db,
      parent.id,
      { status: "inbox" },
      NOW + 2,
    );
    expect(inboxed.projectId).toBeNull();
    expect((await getTaskDetail(database.db, subtask.id))?.projectId).toBeNull();
  });

  it("requires a project outside inbox", async () => {
    await expectCode(
      createTask(database.db, { title: "No project", status: "todo" }, NOW),
      "PROJECT_REQUIRED",
    );

    const alpha = await project();
    const inbox = await createTask(
      database.db,
      { title: "Captured", status: "inbox", projectId: alpha.id },
      NOW,
    );
    expect(inbox.projectId).toBeNull();

    await expectCode(
      updateTask(database.db, inbox.id, { status: "todo" }, NOW),
      "PROJECT_REQUIRED",
    );

    const triaged = await updateTask(
      database.db,
      inbox.id,
      { projectId: alpha.id },
      NOW,
    );
    expect(triaged.status).toBe("backlog");
    expect(triaged.projectId).toBe(alpha.id);
  });

  it("locks status and project on subtasks", async () => {
    const alpha = await project();
    const parent = await createTask(
      database.db,
      { title: "Parent", status: "todo", projectId: alpha.id },
      NOW,
    );
    const subtask = await createTask(
      database.db,
      { title: "Subtask", parentId: parent.id },
      NOW,
    );

    await expectCode(
      updateTask(database.db, subtask.id, { status: "done" }, NOW),
      "SUBTASK_STATUS_LOCKED",
    );
    await expectCode(
      updateTask(database.db, subtask.id, { parentId: parent.id }, NOW),
      "SUBTASK_STATUS_LOCKED",
    );

    const checked = await updateTask(
      database.db,
      subtask.id,
      { completed: true },
      NOW + 1,
    );
    expect(checked.doneAt).toBe(NOW + 1);

    const unchecked = await updateTask(
      database.db,
      subtask.id,
      { completed: false },
      NOW + 2,
    );
    expect(unchecked.doneAt).toBeNull();
  });

  it("enforces one subtask level", async () => {
    const alpha = await project();
    const parent = await createTask(
      database.db,
      { title: "Parent", status: "todo", projectId: alpha.id },
      NOW,
    );
    const subtask = await createTask(
      database.db,
      { title: "Subtask", parentId: parent.id },
      NOW,
    );

    await expectCode(
      createTask(database.db, { title: "Too deep", parentId: subtask.id }, NOW),
      "SUBTASK_DEPTH_EXCEEDED",
    );
    await expectCode(
      updateTask(database.db, parent.id, { parentId: parent.id }, NOW),
      "VALIDATION_ERROR",
    );
  });
});

describe("doing limit", () => {
  it("blocks new doing tasks at capacity without moving existing cards", async () => {
    const alpha = await project();
    await setDoingLimit(database.db, 2, NOW);

    const first = await createTask(
      database.db,
      { title: "One", status: "doing", projectId: alpha.id },
      NOW,
    );
    const second = await createTask(
      database.db,
      { title: "Two", status: "doing", projectId: alpha.id },
      NOW,
    );

    await expectCode(
      createTask(
        database.db,
        { title: "Three", status: "doing", projectId: alpha.id },
        NOW,
      ),
      "DOING_LIMIT_REACHED",
    );

    const waiting = await createTask(
      database.db,
      { title: "Waiting", status: "todo", projectId: alpha.id },
      NOW,
    );
    await expectCode(
      updateTask(database.db, waiting.id, { status: "doing" }, NOW),
      "DOING_LIMIT_REACHED",
    );

    await setDoingLimit(database.db, 1, NOW);
    const board = await getBoardData(database.db, NOW);
    expect(board.columns.doing).toHaveLength(2);
    expect(board.doingLimit).toBe(1);

    const reordered = await updateTask(
      database.db,
      first.id,
      { title: "One renamed" },
      NOW,
    );
    expect(reordered.status).toBe("doing");

    const freed = await updateTask(
      database.db,
      first.id,
      { status: "todo" },
      NOW,
    );
    expect(freed.status).toBe("todo");
    await expectCode(
      updateTask(database.db, waiting.id, { status: "doing" }, NOW),
      "DOING_LIMIT_REACHED",
    );

    await updateTask(database.db, second.id, { status: "todo" }, NOW);
    const moved = await updateTask(
      database.db,
      waiting.id,
      { status: "doing" },
      NOW,
    );
    expect(moved.status).toBe("doing");
  });

  it("reads stored limit before env and falls back to three", async () => {
    expect(await getDoingLimit(database.db, "5")).toBe(5);
    expect(await getDoingLimit(database.db, "nope")).toBe(3);

    await setDoingLimit(database.db, 4, NOW);
    expect(await getDoingLimit(database.db, "5")).toBe(4);
  });
});

describe("done window", () => {
  it("shows only the last seven days on the board but keeps old rows", async () => {
    const alpha = await project();
    const old = await createTask(
      database.db,
      { title: "Old", status: "done", projectId: alpha.id },
      NOW - 8 * DAY,
    );
    const recent = await createTask(
      database.db,
      { title: "Recent", status: "done", projectId: alpha.id },
      NOW - 2 * DAY,
    );

    const board = await listBoardTasks(database.db, NOW);
    expect(board.columns.done.map((task) => task.id)).toEqual([recent.id]);
    expect(board.doneSince).toBe(NOW - 7 * DAY);
    expect(await getTaskDetail(database.db, old.id)).toBeDefined();
  });
});

describe("ordering scopes", () => {
  it("appends new tasks and reorders within a scope", async () => {
    const alpha = await project();
    const first = await createTask(
      database.db,
      { title: "First", status: "todo", projectId: alpha.id },
      NOW,
    );
    const second = await createTask(
      database.db,
      { title: "Second", status: "todo", projectId: alpha.id },
      NOW,
    );

    let board = await listBoardTasks(database.db, NOW);
    expect(board.columns.todo.map((task) => task.id)).toEqual([first.id, second.id]);

    const moved = await updateTask(
      database.db,
      second.id,
      { afterId: first.id },
      NOW + 1,
    );
    expect(moved.position < first.position).toBe(true);

    board = await listBoardTasks(database.db, NOW);
    expect(board.columns.todo.map((task) => task.id)).toEqual([second.id, first.id]);
  });

  it("recomputes position when a task changes scope", async () => {
    const alpha = await project("Alpha");
    const beta = await project("Beta");
    const backlogA = await createTask(
      database.db,
      { title: "A", status: "backlog", projectId: alpha.id },
      NOW,
    );
    await createTask(
      database.db,
      { title: "B", status: "backlog", projectId: beta.id },
      NOW,
    );
    const todoC = await createTask(
      database.db,
      { title: "C", status: "todo", projectId: alpha.id },
      NOW,
    );

    const moved = await updateTask(
      database.db,
      backlogA.id,
      { status: "todo", afterId: todoC.id },
      NOW + 1,
    );
    expect(moved.status).toBe("todo");

    const board = await listBoardTasks(database.db, NOW);
    expect(board.columns.todo.map((task) => task.title)).toEqual(["A", "C"]);
  });

  it("rejects neighbors that are not in the target scope", async () => {
    const alpha = await project();
    await createTask(
      database.db,
      { title: "Todo", status: "todo", projectId: alpha.id },
      NOW,
    );
    const backlog = await createTask(
      database.db,
      { title: "Backlog", status: "backlog", projectId: alpha.id },
      NOW,
    );

    await expectCode(
      updateTask(database.db, backlog.id, { status: "todo", beforeId: 999 }, NOW),
      "CONFLICT",
    );

    const unchanged = await getTaskDetail(database.db, backlog.id);
    expect(unchanged?.status).toBe("backlog");
  });
});
