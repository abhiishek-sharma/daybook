# Personal Dashboard

A self-hosted personal productivity dashboard — dark glass aesthetic, gold accents, runs entirely on your machine. No cloud, no subscriptions.

Built with React + TypeScript on the frontend, Express + SQLite on the backend. Everything persists to a local SQLite file you own.

---

## Screenshots

| Auth | Habits | Finance | Stats |
|---|---|---|---|
| ![Login](docs/screen-auth.png) | ![Habits](docs/screen-habits.png) | ![Finance](docs/screen-finance.png) | ![Stats](docs/screen-stats.png) |

---

## Features

**Habits** — daily check-in tracker with streak counter and contribution heatmap

**Finance** — running balance, monthly spend ceiling, bar chart history, income/expense log

**Reading** — book library with genre tags, star rating, search, and status tracking

**Todos** — tasks with an optional subtext line, grouped by section, toggle/delete

**Notes** — capture notes with categories: General, Idea, Reference, Journal, Quote

**Poetry** — write and store poems

**Trips** — travel log with an "active trip" pin

**Auth** — session-based login with bcrypt, runs locally, no external auth provider

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Express, TypeScript, tsx |
| Database | SQLite via better-sqlite3 |
| Auth | express-session + bcryptjs |
| Animation | Motion (Framer Motion) |
| Charts | Recharts |

---

## Run locally

```bash
# 1. Install dependencies
npm install

# 2. Start both API server and Vite dev server
npm run dev
```

Frontend: `http://localhost:3000` (the Vite dev server proxies `/api` to the API on port 3001).
If port 3000 is already in use, the frontend stops with an error instead of switching ports; free the port or run `npx vite --port=3005 --strictPort` alongside `npm run dev:server`.

The SQLite database (`data/observatory.db`) is created automatically on first run and is git-ignored.

### Configuration

It runs with no configuration, using a default login of `admin` / `changeme` (the server prints a warning while defaults are in use). To set your own, copy `.env.example` to `.env.local`:

| Variable | Purpose | Default |
|---|---|---|
| `OBSERVATORY_USER` | Login username | `admin` |
| `OBSERVATORY_PASSWORD` | Login password | `changeme` |
| `SESSION_SECRET` | Signs the session cookie; use a long random string | dev-only value |
| `PORT` | API port | `3001` |

---

## Project structure

```
src/
  screens/     # one file per route: Habits, Finance, Reading, Todos, Notes, Poetry, Trips
  components/  # Layout, Navigation (sidebar + bottom nav)
  api/         # typed fetch client
  auth/        # AuthContext
  hooks/       # useResource — data fetching hook

server/
  routes/      # Express routers matching each screen
  db.ts        # schema setup and migrations
  auth.ts      # session middleware
  index.ts     # entrypoint
```

---

## License

MIT
