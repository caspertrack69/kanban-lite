import { describe, expect, it } from "vitest";
import { parseTelegramMessage } from "./parse";

const projects = [
  { id: 1, name: "Web" },
  { id: 2, name: "Web Site" },
  { id: 3, name: "Mobile App" },
];

describe("telegram parser", () => {
  it("captures plain text into the inbox", () => {
    expect(parseTelegramMessage("  Buy milk  ", projects)).toEqual({
      type: "inbox",
      title: "Buy milk",
      note: null,
    });
  });

  it("splits additional lines into a note", () => {
    expect(parseTelegramMessage("Fix login\nCheck the reset flow", projects)).toEqual({
      type: "inbox",
      title: "Fix login",
      note: "Check the reset flow",
    });
  });

  it("matches the longest project prefix for /add", () => {
    expect(parseTelegramMessage("/add Web Site Fix header", projects)).toEqual({
      type: "add",
      projectId: 2,
      projectName: "Web Site",
      title: "Fix header",
    });

    expect(parseTelegramMessage("/add web Fix footer", projects)).toEqual({
      type: "add",
      projectId: 1,
      projectName: "Web",
      title: "Fix footer",
    });
  });

  it("does not match a project prefix inside a word", () => {
    expect(parseTelegramMessage("/add Website Fix header", projects)).toEqual({
      type: "unknown_project",
      attempted: "Website Fix header",
      suggestions: ["Web Site", "Web"],
    });
  });

  it("reports unknown projects instead of creating them", () => {
    expect(parseTelegramMessage("/add Nope Do a thing", projects)).toEqual({
      type: "unknown_project",
      attempted: "Nope Do a thing",
      suggestions: [],
    });
    expect(parseTelegramMessage("/list Nope", projects)).toEqual({
      type: "unknown_project",
      attempted: "Nope",
      suggestions: [],
    });
  });

  it("resolves projects by their /projects number", () => {
    expect(parseTelegramMessage("/add 2 Fix login", projects)).toEqual({
      type: "add",
      projectId: 2,
      projectName: "Web Site",
      title: "Fix login",
    });
    expect(parseTelegramMessage("/list 3", projects)).toEqual({
      type: "list",
      projectId: 3,
      projectName: "Mobile App",
    });
    expect(parseTelegramMessage("/add 9 Fix login", projects).type).toBe(
      "unknown_project",
    );
    expect(parseTelegramMessage("/list 9", projects).type).toBe(
      "unknown_project",
    );
    expect(parseTelegramMessage("/add 2", projects).type).toBe("invalid");
  });

  it("falls back to a name when the leading number is out of range", () => {
    const numbered = [
      { id: 4, name: "2026 Roadmap" },
      { id: 5, name: "Personal" },
    ];
    expect(parseTelegramMessage("/add 2026 Roadmap Fix login", numbered)).toEqual(
      {
        type: "add",
        projectId: 4,
        projectName: "2026 Roadmap",
        title: "Fix login",
      },
    );
  });

  it("requires a title after a resolved project", () => {
    const result = parseTelegramMessage("/add Web", projects);
    expect(result.type).toBe("invalid");
  });

  it("filters /list by project case-insensitively", () => {
    expect(parseTelegramMessage("/list web site", projects)).toEqual({
      type: "list",
      projectId: 2,
      projectName: "Web Site",
    });
    expect(parseTelegramMessage("/list", projects)).toEqual({ type: "list" });
  });

  it("parses /move statuses case-insensitively", () => {
    expect(parseTelegramMessage("/move 12 DOING", projects)).toEqual({
      type: "move",
      taskId: 12,
      status: "doing",
    });
    expect(parseTelegramMessage("/move 12 nonsense", projects).type).toBe(
      "invalid",
    );
    expect(parseTelegramMessage("/move abc todo", projects).type).toBe(
      "invalid",
    );
  });

  it("parses /done, /doing, /projects and /newproject", () => {
    expect(parseTelegramMessage("/done 7", projects)).toEqual({
      type: "done",
      taskId: 7,
    });
    expect(parseTelegramMessage("/doing", projects)).toEqual({ type: "doing" });
    expect(parseTelegramMessage("/projects", projects)).toEqual({
      type: "projects",
    });
    expect(parseTelegramMessage("/newproject New Project", projects)).toEqual({
      type: "newproject",
      name: "New Project",
    });
  });

  it("handles bot mentions and unknown commands", () => {
    expect(parseTelegramMessage("/help@kanban_bot", projects)).toEqual({
      type: "help",
    });
    expect(parseTelegramMessage("/wat", projects)).toEqual({
      type: "unknown_command",
      command: "wat",
    });
    expect(parseTelegramMessage("/", projects).type).toBe("invalid");
    expect(parseTelegramMessage("", projects).type).toBe("invalid");
  });

  it("truncates very long captures into a note", () => {
    const result = parseTelegramMessage("x".repeat(250), []);
    expect(result.type).toBe("inbox");
    if (result.type !== "inbox") return;
    expect(result.title).toHaveLength(200);
    expect(result.note).toHaveLength(50);
  });
});
