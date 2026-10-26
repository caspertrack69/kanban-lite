import { describe, expect, it } from "vitest";
import type { ProjectDTO, TaskDTO } from "@/lib/types";
import {
  escapeHtml,
  renderDoing,
  renderProjectNotFound,
  renderProjects,
  renderTaskList,
} from "./format";

const baseTask: TaskDTO = {
  id: 0,
  title: "",
  projectId: 1,
  parentId: null,
  note: null,
  status: "backlog",
  position: "a",
  createdAt: 0,
  updatedAt: 0,
  doneAt: null,
  project: { id: 1, name: "Personal", color: "#96DF74" },
  subtasks: [],
};

function task(
  overrides: Partial<TaskDTO> & Pick<TaskDTO, "id" | "title">,
): TaskDTO {
  return { ...baseTask, ...overrides };
}

const baseProject: ProjectDTO = {
  id: 0,
  name: "",
  color: "#96DF74",
  createdAt: 0,
  taskCount: 0,
};

function project(
  overrides: Partial<ProjectDTO> & Pick<ProjectDTO, "id" | "name">,
): ProjectDTO {
  return { ...baseProject, ...overrides };
}

describe("telegram formatting", () => {
  it("escapes HTML so user text cannot break parse mode", () => {
    expect(escapeHtml("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it("groups tasks by status and shows subtask progress", () => {
    const html = renderTaskList({
      heading: "Backlog and To Do",
      tasks: [
        task({
          id: 1,
          title: "Fix <login>",
          status: "backlog",
          subtasks: [
            task({ id: 2, title: "Reset flow", parentId: 1, status: null, doneAt: 1 }),
            task({ id: 3, title: "Copy", parentId: 1, status: null }),
          ],
        }),
        task({ id: 4, title: "Ship header", status: "todo" }),
      ],
      includeProject: true,
      emptyHint: "nothing",
    });

    expect(html).toContain("<b>Backlog (1)</b>");
    expect(html).toContain("<b>To Do (1)</b>");
    expect(html).toContain("Fix &lt;login&gt;");
    expect(html).toContain("(1/2)");
    expect(html).toContain("[x] <code>#2</code> Reset flow");
    expect(html).toContain("— Personal");
    expect(html).not.toContain("<login>");
  });

  it("truncates long lists with a clear note", () => {
    const tasks = Array.from({ length: 10 }, (_, index) =>
      task({ id: index + 1, title: `Task ${index + 1}` }),
    );

    const html = renderTaskList({
      heading: "Backlog and To Do",
      tasks,
      includeProject: false,
      emptyHint: "nothing",
      maxLines: 3,
    });

    expect(html).toContain("List truncated");
    expect(html).not.toContain("Task 10");
  });

  it("renders the empty state hint", () => {
    const html = renderTaskList({
      heading: "Backlog and To Do — Personal",
      tasks: [],
      includeProject: false,
      emptyHint: "Add a task: <code>/add Personal &lt;title&gt;</code>",
    });

    expect(html).toContain("0 top-level tasks");
    expect(html).toContain("/add Personal");
  });

  it("numbers projects for /add and /list references", () => {
    const html = renderProjects([
      project({ id: 5, name: "Personal", taskCount: 7 }),
      project({ id: 8, name: "Website Revamp", taskCount: 1 }),
    ]);

    expect(html).toContain("<code>1</code>. Personal — 7 tasks");
    expect(html).toContain("<code>2</code>. Website Revamp — 1 task");
    expect(html).toContain("/add 1 &lt;title&gt;");
  });

  it("shows remaining Doing slots and project names", () => {
    const html = renderDoing(
      [
        task({
          id: 11,
          title: "Fix header",
          status: "doing",
          project: { id: 2, name: "Website Revamp", color: "#8C72DB" },
          subtasks: [task({ id: 12, title: "Step", parentId: 11, status: null })],
        }),
      ],
      3,
    );

    expect(html).toContain("Doing 1/3");
    expect(html).toContain("2 slots left");
    expect(html).toContain("— Website Revamp");
    expect(html).toContain("(0/1)");
  });

  it("suggests close project names on a miss", () => {
    const html = renderProjectNotFound(
      "Website Revamp cek local",
      ["Website Revamp"],
      [project({ id: 1, name: "Website Revamp", taskCount: 28 })],
    );

    expect(html).toContain("Project not found");
    expect(html).toContain("Website Revamp");
    expect(html).toContain("<b>Projects</b>");
  });
});
