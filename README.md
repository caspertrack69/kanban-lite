# Kanban Lite

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A single-user, dark-mode Kanban for capturing ideas from Telegram and keeping only the work in front of you on the active board.

- **Inbox** for raw captures.
- **Per-project backlog** for ideas and future work.
- **One active board** with To Do, Doing, and Done.
- **Nested subtasks** (one level) with progress and persisted collapse state.
- **Doing limit** stored in the database and editable in Settings.
- **Done window** limited to the last 7 days on the board; older rows stay in the database.
- **Password-protected web app** and an owner-only Telegram webhook.

The UI follows `designsystem.json` as its visual source of truth. That file is intentionally gitignored; generated token artifacts are committed so the app builds without it.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Drizzle ORM + libSQL/SQLite · TanStack Query · dnd-kit · grammY · iron-session · Zod · Vitest.

## Requirements

- Node.js **22.13 or newer** (required by iron-session v9).
- npm.
- Optional: a Telegram bot token and a public HTTPS URL for the webhook.
- Optional for production: Turso (libSQL) with an auth token.

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. The first visit redirects to `/login`.

Use `npm run dev` for local HTTP. In a production build the session cookie is `Secure`, so `next start` must be served over HTTPS; otherwise the browser will not send the cookie back.

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `APP_PASSWORD` | Yes | Password for the web login. |
| `SESSION_PASSWORD` | Yes | iron-session encryption key, at least 32 characters. `SESSION_SECRET` is accepted as a legacy fallback. |
| `DATABASE_URL` | Yes | `file:./local.db` locally; `libsql://...` for Turso. |
| `DATABASE_AUTH_TOKEN` | Production | Turso token. Omit for local files. |
| `DOING_LIMIT` | No | Initial Doing limit when no `setting` row exists. Defaults to `3`. |
| `TELEGRAM_BOT_TOKEN` | Telegram only | BotFather token. |
| `TELEGRAM_OWNER_ID` | Telegram only | Numeric Telegram user ID. All other users and all group chats are ignored. |
| `TELEGRAM_WEBHOOK_SECRET` | Telegram only | Compared with `X-Telegram-Bot-Api-Secret-Token`. |
| `APP_URL` | Optional | Public app URL used by the webhook setup script. |

Secrets are read lazily inside request handlers, so the app can build and typecheck without them. Missing auth/database configuration returns a visible error instead of crashing at module load.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js in development. |
| `npm run build` | Production build. |
| `npm start` | Start the production build. |
| `npm test` | Run Vitest. |
| `npm run test:watch` | Watch mode. |
| `npm run typegen` | Generate Next.js route types. |
| `npm run typecheck` | `next typegen` + `tsc --noEmit`. |
| `npm run lint` | ESLint. |
| `npm run verify` | Typecheck, lint, and tests. |
| `npm run db:generate` | Generate a Drizzle migration after schema changes. |
| `npm run db:migrate` | Apply pending migrations to `DATABASE_URL`. |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run db:backup` | Export projects, tasks, and settings to a timestamped JSON file. |
| `npm run db:seed` | Insert demo projects, tasks, subtasks, and settings for UI previews. |
| `npm run design:tokens` | Regenerate `app/design-tokens.css` and `lib/design-tokens.generated.ts` from `designsystem.json`. |
| `npm run telegram:webhook -- https://your-host` | Register the Telegram webhook. |
| `npm run telegram:poll` | Run the bot with long polling for local testing (no public URL needed). |

## Database and migrations

Local development uses a SQLite file through libSQL:

```env
DATABASE_URL=file:./local.db
```

Production uses Turso:

```env
DATABASE_URL=libsql://<database>-<organization>.turso.io
DATABASE_AUTH_TOKEN=<token>
```

Schema changes follow generate + migrate:

```powershell
npm run db:generate
npm run db:migrate
```

Migrations are committed under `db/migrations/`. Do not use `drizzle-kit push` against production.

The schema enforces:

- Status values: `inbox`, `backlog`, `todo`, `doing`, `done`.
- Top-level tasks always have a status; subtasks always have `null` status.
- `inbox` has no project; every other top-level status requires one.
- One subtask level, enforced by services.
- Case-insensitive unique project names.
- Cascading project/task deletes, with explicit child deletes in services as a second line of defense.

## Demo data

Seed a realistic set of projects, inbox captures, board cards, backlog items, and nested subtasks:

```powershell
npm run db:seed
```

Existing rows are kept. To replace the database contents with the demo set, run:

```powershell
npm run db:seed -- --reset
```

`--reset` writes a timestamped backup to `backups/` before deleting anything. The seeder refuses to touch a non-file database unless `--allow-remote` is passed.

## Telegram bot

1. Create a bot with BotFather and put the token in `.env.local`.
2. Put your numeric Telegram user ID in `TELEGRAM_OWNER_ID`.
3. Set a random `TELEGRAM_WEBHOOK_SECRET`.
4. Expose the app over HTTPS (deployment or a tunnel).
5. Register the webhook:

```powershell
npm run telegram:webhook -- https://your-host
```

Remove it with:

```powershell
npm run telegram:webhook -- --delete
```

### Local testing with long polling

Telegram cannot reach `localhost`, so use polling while developing:

```powershell
npm run telegram:poll
```

This connects the bot directly to Telegram, deletes any registered webhook, and drops updates queued while the bot was offline. Send commands in Telegram as usual; stop with `Ctrl+C`. Polling and a webhook cannot be active for the same bot at once, so re-register the webhook before relying on the deployed app again.

Commands:

| Command | Result |
|---|---|
| Plain text | Captured in Inbox. First line is the title; remaining lines become a note. |
| `/add <project> <title>` | Adds to that project’s backlog. The project can be a name prefix or the number shown by `/projects`. |
| `/list [project\|number]` | Backlog + To Do tasks, grouped by status and filterable by project. Nested subtasks are indented; long lists are truncated with a pointer to the web app. |
| `/doing` | Doing tasks with count/limit, remaining slots, and subtask progress. |
| `/move <id> <backlog\|todo\|doing\|done>` | Moves a top-level task and reports the old and new status. Subtasks are rejected. |
| `/done <id>` | Completes a parent or checks a subtask. |
| `/projects` | Lists projects as a numbered list with task counts. Those numbers work in `/add` and `/list`. |
| `/newproject <name>` | Creates a project with the next palette color. |
| `/help` | Grouped command reference. |

Replies use Telegram HTML formatting, so commands and `#id` values render as tappable code. Unknown projects are answered with the closest matches plus the numbered project list.

Only the owner in a private chat is processed. Requests with a bad secret token receive `401`. Task replies include the numeric `#id`.

## Backup

```powershell
npm run db:backup
```

The script exports `project`, `task`, and `setting` rows to `backups/kanban-<timestamp>.json`. The `backups/` directory is gitignored. The script works with local files and Turso.

## Deploy to Vercel + Turso

1. Create a Turso database and copy its URL and auth token.
2. In Vercel, set `APP_PASSWORD`, `SESSION_PASSWORD`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, and the Telegram variables.
3. Apply migrations to the production database from your machine:

   ```powershell
   $env:DATABASE_URL="libsql://..."
   $env:DATABASE_AUTH_TOKEN="..."
   npm run db:migrate
   ```

4. Deploy the project to Vercel.
5. Register the Telegram webhook with the deployment URL.

Vercel Hobby is suitable for this personal, non-commercial project. The bot handlers run only a query or two per update; no scheduled jobs are used.

## Design tokens

`designsystem.json` is the visual source of truth and remains uncommitted. Generated artifacts are committed:

- `app/design-tokens.css` — CSS variables and Tailwind `@theme` mappings.
- `lib/design-tokens.generated.ts` — palette, status colors, and danger color.

To change visual tokens, edit the local `designsystem.json` and run:

```powershell
npm run design:tokens
```

Do not edit generated files by hand. If the JSON file is absent, the generation script fails with a clear message, but committed artifacts still build the app.

## Routes

| Route | Content |
|---|---|
| `/login` | Password login. |
| `/` | Active board: To Do, Doing, Done. |
| `/inbox` | Inbox list with project triage. |
| `/p/[projectId]` | Project backlog. |
| `/settings` | Doing limit and project management. |

## Verification

```powershell
npm run verify
npm run build
```

`npm test` covers ordering, validation, task tree helpers, optimistic cache moves, date formatting, same-origin checks, password comparison, Telegram parsing, and database/service integrity (project uniqueness, cascades, subtask project sync, status/done rules, Doing limit, 7-day Done window, scope ordering, one-level depth).

## Notes and limits

- Single user; no collaboration, realtime updates, assignees, labels, due dates, comments, or search.
- Dark theme only, matching `designsystem.json`.
- The board data is intentionally small: Todo/Doing are cross-project, and Done shows only the last 7 days.
- Optimistic board/list moves roll back on server errors; Doing capacity and project rules are enforced on the server.

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 Casper.
