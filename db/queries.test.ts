import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./test-utils";
import { createProject, listProjectsService } from "./services/projects";
import { createTask } from "./services/tasks";
import {
  getTaskDetail,
  listBacklogTasks,
  listBoardTasks,
  listInboxTasks,
  listTelegramTasks,
} from "./queries/tasks";
import { PROJECT_COLORS } from "@/lib/design-tokens.generated";
import { task } from "./schema";

const COLOR = PROJECT_COLORS[0];
const NOW = Date.UTC(2026, 1, 20, 12, 0, 0);

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

describe("task queries", () => {
  it("returns a board with all three columns and nested subtasks", async () => {
    const alpha = await project();
    const todo = await createTask(
      database.db,
      { title: "Todo", status: "todo", projectId: alpha.id },
      NOW,
    );
    await createTask(
      database.db,
      { title: "Doing", status: "doing", projectId: alpha.id },
      NOW,
    );
    const done = await createTask(
      database.db,
      { title: "Done", status: "done", projectId: alpha.id },
      NOW,
    );
    const subtask = await createTask(
      database.db,
      { title: "Subtask", parentId: todo.id },
      NOW,
    );
    await createTask(
      database.db,
      { title: "Done subtask", parentId: done.id },
      NOW,
    );

    const board = await listBoardTasks(database.db, NOW);
    expect(Object.keys(board.columns).sort()).toEqual([
      "doing",
      "done",
      "todo",
    ]);
    expect(board.columns.todo[0].id).toBe(todo.id);
    expect(board.columns.todo[0].subtasks[0].id).toBe(subtask.id);
    expect(board.columns.done[0].subtasks).toHaveLength(1);
    expect(board.doneSince).toBe(NOW - 7 * 86_400_000);
  });

  it("returns inbox and backlog lists with nested subtasks", async () => {
    const alpha = await project();
    const inbox = await createTask(
      database.db,
      { title: "Inbox", status: "inbox" },
      NOW,
    );
    await createTask(
      database.db,
      { title: "Inbox subtask", parentId: inbox.id },
      NOW,
    );
    const backlog = await createTask(
      database.db,
      { title: "Backlog", status: "backlog", projectId: alpha.id },
      NOW,
    );
    await createTask(
      database.db,
      { title: "Backlog subtask", parentId: backlog.id },
      NOW,
    );

    const inboxTasks = await listInboxTasks(database.db);
    expect(inboxTasks).toHaveLength(1);
    expect(inboxTasks[0].subtasks[0].title).toBe("Inbox subtask");
    expect(inboxTasks[0].project).toBeNull();

    const backlogTasks = await listBacklogTasks(database.db, alpha.id);
    expect(backlogTasks).toHaveLength(1);
    expect(backlogTasks[0].project?.name).toBe("Alpha");
    expect(backlogTasks[0].subtasks[0].title).toBe("Backlog subtask");
  });

  it("includes backlog and todo in the telegram list", async () => {
    const alpha = await project();
    await createTask(
      database.db,
      { title: "Backlog", status: "backlog", projectId: alpha.id },
      NOW,
    );
    await createTask(
      database.db,
      { title: "Todo", status: "todo", projectId: alpha.id },
      NOW,
    );
    await createTask(
      database.db,
      { title: "Doing", status: "doing", projectId: alpha.id },
      NOW,
    );

    const list = await listTelegramTasks(database.db);
    expect(list.map((item) => item.title)).toEqual(["Backlog", "Todo"]);
    expect(
      (await listTelegramTasks(database.db, alpha.id)).map((item) => item.title),
    ).toEqual(["Backlog", "Todo"]);
  });

  it("counts parents and subtasks in project totals", async () => {
    const alpha = await project();
    const parent = await createTask(
      database.db,
      { title: "Parent", status: "backlog", projectId: alpha.id },
      NOW,
    );
    await createTask(database.db, { title: "A", parentId: parent.id }, NOW);
    await createTask(database.db, { title: "B", parentId: parent.id }, NOW);
    await createTask(
      database.db,
      { title: "Todo", status: "todo", projectId: alpha.id },
      NOW,
    );
    await createTask(database.db, { title: "Inbox", status: "inbox" }, NOW);

    const projects = await listProjectsService(database.db);
    expect(projects[0].taskCount).toBe(4);
  });

  it("orders equal positions by id", async () => {
    const alpha = await project();
    await database.db.insert(task).values({
      projectId: alpha.id,
      parentId: null,
      title: "First tie",
      note: null,
      status: "todo",
      position: "a0",
      createdAt: NOW,
      updatedAt: NOW,
      doneAt: null,
    });
    await database.db.insert(task).values({
      projectId: alpha.id,
      parentId: null,
      title: "Second tie",
      note: null,
      status: "todo",
      position: "a0",
      createdAt: NOW,
      updatedAt: NOW,
      doneAt: null,
    });

    const board = await listBoardTasks(database.db, NOW);
    expect(board.columns.todo.map((item) => item.title)).toEqual([
      "First tie",
      "Second tie",
    ]);
  });

  it("returns a task with its subtasks and project summary", async () => {
    const alpha = await project();
    const parent = await createTask(
      database.db,
      { title: "Parent", status: "backlog", projectId: alpha.id },
      NOW,
    );
    await createTask(database.db, { title: "Sub", parentId: parent.id }, NOW);

    const detail = await getTaskDetail(database.db, parent.id);
    expect(detail?.project?.color).toBe(COLOR);
    expect(detail?.subtasks).toHaveLength(1);
    expect(detail?.subtasks[0].parentId).toBe(parent.id);
  });
});
