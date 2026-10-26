#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { generateKeyBetween } from "fractional-indexing";

config({ path: [".env.local", ".env"], quiet: true });

const DAY = 86_400_000;
const HOUR = 3_600_000;
const DOING_LIMIT = 4;

const args = new Set(process.argv.slice(2));
const reset = args.has("--reset");
const allowRemote = args.has("--allow-remote");

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: npm run db:seed -- [--reset] [--allow-remote]

Insert demo data for UI previews: projects, inbox captures, board cards,
backlog items, and nested subtasks.

  --reset         Replace projects, tasks, and settings with the demo set.
                  When data exists, a timestamped backup is written to
                  backups/ before anything is deleted.
  --allow-remote  Permit seeding a non-file database such as Turso.
`);
  process.exit(0);
}

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;

if (!url) {
  console.error("Missing DATABASE_URL.");
  process.exit(1);
}

const localDatabase = url.startsWith("file:") || url.startsWith(":memory:");
if (!localDatabase && !allowRemote) {
  console.error(
    "Refusing to seed a non-local database. Pass --allow-remote if this is intentional.",
  );
  process.exit(1);
}

const PROJECTS = [
  {
    key: "website",
    name: "Website Revamp",
    color: "#8C72DB",
    createdDaysAgo: 45,
  },
  {
    key: "mobile",
    name: "Mobile App",
    color: "#72A2DA",
    createdDaysAgo: 38,
  },
  {
    key: "marketing",
    name: "Marketing Launch",
    color: "#DB8648",
    createdDaysAgo: 30,
  },
  {
    key: "personal",
    name: "Personal",
    color: "#96DF74",
    createdDaysAgo: 22,
  },
];

const INBOX = [
  {
    title: "Try a command palette for quick task capture",
    note: "Look at how Linear and Height handle fuzzy search, recent items, and keyboard-only navigation.",
    createdDaysAgo: 0.4,
    updatedDaysAgo: 0.1,
  },
  {
    title: "Renew the domain before it expires",
    note: "Expires 12 November. Move billing to the shared card and enable auto-renew.",
    createdDaysAgo: 1.4,
    updatedDaysAgo: 1.2,
  },
  {
    title: "Idea: weekly review template with three prompts",
    note: "What moved?\nWhat is stuck?\nWhat deserves focus next week?",
    createdDaysAgo: 2.6,
    updatedDaysAgo: 2.2,
  },
  {
    title:
      "Research offline-first sync options for the mobile prototype and summarize the trade-offs",
    note: "Compare PowerSync, ElectricSQL, and a hand-rolled queue. Include conflict handling and pricing.",
    createdDaysAgo: 3.8,
    updatedDaysAgo: 3.4,
  },
  {
    title: "Book a dentist appointment",
    createdDaysAgo: 5.2,
    updatedDaysAgo: 4.8,
  },
  {
    title: "Plan the December team offsite",
    note: "Keep it to one day and make the afternoon optional.",
    createdDaysAgo: 6.4,
    updatedDaysAgo: 5.9,
    subtasks: [
      { title: "Shortlist three venues", done: true, doneDaysAgo: 5.1 },
      { title: "Draft a rough agenda", done: false },
      { title: "Collect dietary restrictions", done: false },
    ],
  },
];

const BACKLOG = {
  website: [
    {
      title: "Add a public changelog page",
      note: "Pull from release notes and keep the latest three entries on the marketing site.",
      createdDaysAgo: 18,
      updatedDaysAgo: 4,
      subtasks: [
        { title: "Design the empty state", done: true, doneDaysAgo: 3.1 },
        { title: "Wire the RSS feed", done: false },
      ],
    },
    {
      title: "Self-host the variable fonts",
      note: "Remove the render-blocking Google Fonts request and document the license.",
      createdDaysAgo: 16,
      updatedDaysAgo: 6,
    },
    {
      title: "Track pricing page conversions",
      note: "Instrument the annual toggle and both plan CTAs before the next campaign.",
      createdDaysAgo: 14,
      updatedDaysAgo: 2,
      subtasks: [
        { title: "Define the events", done: true, doneDaysAgo: 1.8 },
        { title: "Build a small dashboard", done: false },
      ],
    },
    {
      title: "Refresh the about page photography",
      note: "Book a half-day shoot and keep the new selects under 600 KB each.",
      createdDaysAgo: 11,
      updatedDaysAgo: 7,
    },
  ],
  mobile: [
    {
      title: "Offline queue for failed syncs",
      note: "Retry with exponential backoff and surface a clear status banner when the queue is stuck.",
      createdDaysAgo: 20,
      updatedDaysAgo: 1,
      subtasks: [
        { title: "Choose a storage layer", done: true, doneDaysAgo: 2.2 },
        { title: "Add retry limits", done: false },
        { title: "Design the sync banner", done: false },
      ],
    },
    {
      title: "Biometric unlock",
      note: "Face ID and fingerprint with a PIN fallback for older devices.",
      createdDaysAgo: 17,
      updatedDaysAgo: 5,
    },
    {
      title: "Home-screen widget for today's focus",
      note: "Show the top three Doing cards and a single quick-add action.",
      createdDaysAgo: 15,
      updatedDaysAgo: 7,
    },
    {
      title: "Reduce cold start time below 1.5 seconds",
      note: "Profile the first render before adding more caching.",
      createdDaysAgo: 12,
      updatedDaysAgo: 3.5,
      subtasks: [
        { title: "Profile startup", done: true, doneDaysAgo: 3.2 },
        { title: "Lazy-load heavy modules", done: false },
      ],
    },
  ],
  marketing: [
    {
      title: "Record a 60-second product demo",
      note: "Captions only, no voiceover. Show inbox to board in one take.",
      createdDaysAgo: 11,
      updatedDaysAgo: 0.8,
      subtasks: [
        { title: "Write the shot list", done: true, doneDaysAgo: 1.2 },
        { title: "Record the screen", done: true, doneDaysAgo: 0.9 },
        { title: "Add captions", done: false },
      ],
    },
    {
      title: "Run an A/B test on the landing page headline",
      note: "Keep the current page as control and run it for at least two weeks.",
      createdDaysAgo: 9,
      updatedDaysAgo: 4,
    },
    {
      title: "Partner newsletter swap",
      note: "Shortlist three newsletters with overlapping audiences and send the one-pager.",
      createdDaysAgo: 8,
      updatedDaysAgo: 6,
    },
  ],
  personal: [
    {
      title: "Read Deep Work",
      note: "Two chapters a week and keep notes in the reading journal.",
      createdDaysAgo: 25,
      updatedDaysAgo: 2,
      subtasks: [
        { title: "Finish part 1", done: true, doneDaysAgo: 3 },
        { title: "Finish part 2", done: false },
      ],
    },
    {
      title: "Plan a weekend hike",
      note: "Check the weather Friday and pick a route under 12 km.",
      createdDaysAgo: 13,
      updatedDaysAgo: 5.5,
    },
    {
      title: "Sort the photo library",
      note: "Delete duplicates and export 2024 favorites to the archive drive.",
      createdDaysAgo: 10,
      updatedDaysAgo: 7.5,
    },
  ],
};

const BOARD = {
  todo: [
    {
      project: "website",
      title: "Finalize onboarding copy",
      note: "Tighten the first-run checklist and remove internal jargon.",
      createdDaysAgo: 9,
      updatedDaysAgo: 0.5,
      subtasks: [
        { title: "Rewrite the welcome step", done: true, doneDaysAgo: 2.5 },
        { title: "Cut the checklist to five items", done: false },
        { title: "Ask someone outside the team to read it", done: false },
      ],
    },
    {
      project: "mobile",
      title: "Set up error monitoring",
      note: "Capture crashes and stalled syncs with release tags and a clear owner.",
      createdDaysAgo: 8,
      updatedDaysAgo: 1.5,
      subtasks: [
        { title: "Pick the provider", done: false },
        { title: "Add release tagging", done: false },
      ],
    },
    {
      project: "marketing",
      title: "Draft the launch email sequence",
      note: "Three emails: teaser, launch day, and a short last call.",
      createdDaysAgo: 7,
      updatedDaysAgo: 3,
      subtasks: [
        { title: "Write the teaser", done: true, doneDaysAgo: 4 },
        { title: "Write the launch-day email", done: false },
        { title: "Write the last-call email", done: false },
      ],
    },
    {
      project: "personal",
      title: "Book the annual health check",
      note: "Ask about the new clinic on the east side.",
      createdDaysAgo: 6,
      updatedDaysAgo: 4,
    },
    {
      project: "website",
      title: "Audit keyboard navigation on the board",
      note: "Check that every drag-and-drop action has a keyboard path.",
      createdDaysAgo: 5,
      updatedDaysAgo: 0.6,
      subtasks: [
        { title: "Check tab order", done: true, doneDaysAgo: 1.1 },
        { title: "Verify focus rings", done: true, doneDaysAgo: 2 },
        { title: "Add screen-reader labels", done: false },
      ],
    },
    {
      project: "mobile",
      title: "Write the empty-state copy for Inbox",
      note: "Explain what Inbox is for without sounding like a help article. Keep it under 30 words.",
      createdDaysAgo: 4,
      updatedDaysAgo: 0.2,
    },
  ],
  doing: [
    {
      project: "website",
      title: "Rebuild the pricing page",
      note: "New comparison table, annual toggle, and a calmer hierarchy. Keep the FAQ.",
      createdDaysAgo: 12,
      updatedDaysAgo: 0.3,
      subtasks: [
        { title: "Build the comparison table", done: true, doneDaysAgo: 2 },
        { title: "Add the annual toggle", done: true, doneDaysAgo: 1 },
        { title: "Do a mobile pass", done: false },
        { title: "Review the final copy", done: false },
      ],
    },
    {
      project: "mobile",
      title: "Ship the push notification prototype",
      note: "Local notifications first; remote push after permissions settle down.",
      createdDaysAgo: 10,
      updatedDaysAgo: 1.3,
      subtasks: [
        { title: "Build the permission prompt", done: true, doneDaysAgo: 2 },
        { title: "Add the daily reminder", done: false },
        { title: "Support quiet hours", done: false },
      ],
    },
    {
      project: "marketing",
      title: "Prepare the Product Hunt launch assets",
      note: "Gallery images, tagline, first comment, and a 30-second clip.",
      createdDaysAgo: 8,
      updatedDaysAgo: 2.6,
      subtasks: [
        { title: "Export gallery images", done: true, doneDaysAgo: 3.2 },
        { title: "Pick a tagline", done: true, doneDaysAgo: 2.2 },
        { title: "Draft the first comment", done: false },
        { title: "Cut the 30-second clip", done: false },
      ],
    },
  ],
  done: [
    {
      project: "website",
      title: "Audit color contrast in dark mode",
      note: "Raised muted text and fixed the disabled-state pair.",
      createdDaysAgo: 15,
      doneDaysAgo: 0.3,
      subtasks: [
        { title: "Check muted text pairs", done: true, doneDaysAgo: 0.4 },
        { title: "Fix the disabled state", done: true, doneDaysAgo: 0.3 },
      ],
    },
    {
      project: "mobile",
      title: "Migrate CI to Node 22",
      note: "Pinned the toolchain and removed the legacy build flag.",
      createdDaysAgo: 20,
      doneDaysAgo: 1.1,
    },
    {
      project: "marketing",
      title: "Write the launch checklist",
      note: "Covers DNS, analytics, support macros, and the rollback plan.",
      createdDaysAgo: 18,
      doneDaysAgo: 2.2,
      subtasks: [
        { title: "Verify DNS and TLS", done: true, doneDaysAgo: 4 },
        { title: "Check analytics events", done: true, doneDaysAgo: 3 },
        { title: "Prepare support macros", done: true, doneDaysAgo: 2.5 },
        { title: "Document the rollback plan", done: true, doneDaysAgo: 2.2 },
      ],
    },
    {
      project: "website",
      title: "Set up the Turso production database",
      note: "Applied migrations and documented the backup routine.",
      createdDaysAgo: 21,
      doneDaysAgo: 3.4,
      subtasks: [
        { title: "Create the database", done: true, doneDaysAgo: 4.2 },
        { title: "Run migrations", done: true, doneDaysAgo: 3.4 },
      ],
    },
    {
      project: "marketing",
      title: "Clean up the Figma component library",
      note: "Removed duplicate buttons and renamed the card variants.",
      createdDaysAgo: 26,
      doneDaysAgo: 5.2,
    },
    {
      project: "personal",
      title: "Buy a birthday gift for Mom",
      note: "Shipped to arrive before Saturday.",
      createdDaysAgo: 9,
      doneDaysAgo: 6.5,
    },
    {
      project: "website",
      title: "Archive the old landing page",
      note: "Kept outside the Done window to verify the seven-day cutoff.",
      createdDaysAgo: 30,
      doneDaysAgo: 9.2,
    },
  ],
};

function ago(now, days) {
  return Math.round(now - days * DAY);
}

function resolveTimes(now, { createdDaysAgo, updatedDaysAgo, doneDaysAgo }) {
  const createdAt = ago(now, createdDaysAgo);
  const updatedAt = Math.max(createdAt + HOUR, ago(now, updatedDaysAgo));
  const doneAt =
    doneDaysAgo === null || doneDaysAgo === undefined
      ? null
      : Math.max(createdAt + HOUR, ago(now, doneDaysAgo));

  return { createdAt, updatedAt: doneAt ?? updatedAt, doneAt };
}

function createPositioner() {
  let last = null;
  return () => {
    const next = generateKeyBetween(last, null);
    last = next;
    return next;
  };
}

const positioners = new Map();

function nextPosition(scope) {
  let positioner = positioners.get(scope);
  if (!positioner) {
    positioner = createPositioner();
    positioners.set(scope, positioner);
  }
  return positioner();
}

async function insertTaskRow(tx, values) {
  const result = await tx.execute({
    sql: `INSERT INTO task
      (project_id, parent_id, title, note, status, position, created_at, updated_at, done_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      values.projectId,
      values.parentId,
      values.title,
      values.note,
      values.status,
      values.position,
      values.createdAt,
      values.updatedAt,
      values.doneAt,
    ],
  });
  return Number(result.lastInsertRowid);
}

async function insertTopLevel(tx, item, options) {
  const { projectId, status, now, counts } = options;
  const times = resolveTimes(now, {
    createdDaysAgo: item.createdDaysAgo ?? 10,
    updatedDaysAgo: item.doneDaysAgo ?? item.updatedDaysAgo ?? 0,
    doneDaysAgo: status === "done" ? item.doneDaysAgo ?? 0 : null,
  });
  const scope =
    status === "inbox"
      ? "inbox"
      : status === "backlog"
        ? `backlog:${projectId}`
        : `board:${status}`;
  const parentId = await insertTaskRow(tx, {
    projectId,
    parentId: null,
    title: item.title,
    note: item.note ?? null,
    status,
    position: nextPosition(scope),
    ...times,
  });
  counts.topLevel += 1;

  for (const subtask of item.subtasks ?? []) {
    const done = subtask.done === true;
    const subtaskTimes = resolveTimes(now, {
      createdDaysAgo:
        subtask.createdDaysAgo ??
        Math.max(0, (item.createdDaysAgo ?? 10) - 0.5),
      updatedDaysAgo: done
        ? subtask.doneDaysAgo ?? 1
        : subtask.updatedDaysAgo ??
          Math.max(0, (item.updatedDaysAgo ?? 0) + 0.05),
      doneDaysAgo: done ? subtask.doneDaysAgo ?? 1 : null,
    });
    await insertTaskRow(tx, {
      projectId,
      parentId,
      title: subtask.title,
      note: subtask.note ?? null,
      status: null,
      position: nextPosition(`subtask:${parentId}`),
      ...subtaskTimes,
    });
    counts.subtasks += 1;
  }

  return parentId;
}

async function seed(tx, now) {
  const projectIds = new Map();
  const counts = { projects: 0, topLevel: 0, subtasks: 0 };

  for (const project of PROJECTS) {
    const result = await tx.execute({
      sql: "INSERT INTO project (name, color, created_at) VALUES (?, ?, ?)",
      args: [project.name, project.color, ago(now, project.createdDaysAgo)],
    });
    projectIds.set(project.key, Number(result.lastInsertRowid));
    counts.projects += 1;
  }

  for (const item of INBOX) {
    await insertTopLevel(tx, item, {
      projectId: null,
      status: "inbox",
      now,
      counts,
    });
  }

  for (const status of ["todo", "doing", "done"]) {
    for (const item of BOARD[status]) {
      const projectId = projectIds.get(item.project);
      if (projectId === undefined) {
        throw new Error(`Unknown project key: ${item.project}`);
      }
      await insertTopLevel(tx, item, { projectId, status, now, counts });
    }
  }

  for (const project of PROJECTS) {
    const projectId = projectIds.get(project.key);
    for (const item of BACKLOG[project.key] ?? []) {
      await insertTopLevel(tx, item, {
        projectId,
        status: "backlog",
        now,
        counts,
      });
    }
  }

  await tx.execute({
    sql: `INSERT INTO setting (key, value, updated_at) VALUES ('doing_limit', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [String(DOING_LIMIT), now],
  });

  return { projectIds, counts };
}

async function backupBeforeReset(client) {
  const [projects, tasks, settings] = await Promise.all([
    client.execute(
      "SELECT id, name, color, created_at AS createdAt FROM project ORDER BY id",
    ),
    client.execute(
      "SELECT id, project_id AS projectId, parent_id AS parentId, title, note, status, position, created_at AS createdAt, updated_at AS updatedAt, done_at AS doneAt FROM task ORDER BY id",
    ),
    client.execute(
      "SELECT key, value, updated_at AS updatedAt FROM setting ORDER BY key",
    ),
  ]);

  const counts = {
    projects: projects.rows.length,
    tasks: tasks.rows.length,
    settings: settings.rows.length,
  };
  if (counts.projects + counts.tasks + counts.settings === 0) return null;

  const exportedAt = new Date();
  const backup = {
    format: "kanban-lite-backup",
    version: 1,
    exportedAt: exportedAt.toISOString(),
    counts,
    projects: projects.rows,
    tasks: tasks.rows,
    settings: settings.rows,
  };
  const stamp = exportedAt
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const directory = resolve(process.cwd(), "backups");
  const file = resolve(directory, `kanban-before-seed-${stamp}.json`);

  await mkdir(directory, { recursive: true });
  await writeFile(file, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
  return file;
}

const client = createClient({ url, authToken });

try {
  try {
    await client.execute("PRAGMA foreign_keys = ON");
  } catch (error) {
    console.warn(
      "[seed] Could not enable foreign_keys for this connection.",
      error instanceof Error ? error.message : error,
    );
  }

  const existing = await client.execute("SELECT name FROM project");
  const existingNames = new Set(
    existing.rows.map((row) => String(row.name).toLowerCase()),
  );
  const collision = PROJECTS.find((project) =>
    existingNames.has(project.name.toLowerCase()),
  );

  if (!reset && collision) {
    throw new Error(
      `Project "${collision.name}" already exists. Re-run with "npm run db:seed -- --reset" to replace the demo data.`,
    );
  }

  if (reset) {
    const backupPath = await backupBeforeReset(client);
    if (backupPath) console.log(`Backup written to ${backupPath}`);
  }

  const now = Date.now();
  const tx = await client.transaction("write");
  let seeded;
  try {
    if (reset) {
      await tx.execute("DELETE FROM task");
      await tx.execute("DELETE FROM project");
      await tx.execute("DELETE FROM setting");
    }
    seeded = await seed(tx, now);
    await tx.commit();
  } catch (error) {
    await tx.rollback().catch(() => {});
    throw error;
  }

  console.log(
    `Seeded ${seeded.counts.projects} projects, ${seeded.counts.topLevel} top-level tasks, and ${seeded.counts.subtasks} subtasks.`,
  );
  console.log(`Doing limit set to ${DOING_LIMIT}.`);
  console.log("Backlog previews:");
  for (const project of PROJECTS) {
    console.log(
      `  /p/${seeded.projectIds.get(project.key)}  ${project.name}`,
    );
  }
  console.log("Start the app with `npm run dev`, then open http://localhost:3000.");
} catch (error) {
  console.error(
    "Seed failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
} finally {
  client.close();
}
