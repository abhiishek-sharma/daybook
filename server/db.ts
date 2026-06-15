import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'observatory.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '✨',
    created_at TEXT NOT NULL DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_on TEXT NOT NULL,
    UNIQUE(habit_id, completed_on)
  );
  CREATE INDEX IF NOT EXISTS idx_completions_date ON habit_completions(completed_on);

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    occurred_on TEXT NOT NULL DEFAULT (date('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(occurred_on);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    time_estimate TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    tag TEXT NOT NULL DEFAULT 'All Reads',
    starred INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    subtext TEXT NOT NULL DEFAULT '',
    section TEXT NOT NULL DEFAULT 'Horizon Sync',
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    start_date TEXT,
    end_date TEXT,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    depart_from TEXT NOT NULL DEFAULT '',
    arrive_at TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trip_prep (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    missing_items TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS poems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    written_on TEXT NOT NULL DEFAULT (date('now')),
    featured INTEGER NOT NULL DEFAULT 0,
    language TEXT NOT NULL DEFAULT 'English'
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Reflection',
    image_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function addColumnIfMissing(table: string, column: string, defSql: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${defSql}`);
  }
}

addColumnIfMissing('poems', 'language', "TEXT NOT NULL DEFAULT 'English'");

db.exec(`
  UPDATE todos SET section = 'Priority' WHERE section = 'Zenith Alignment';
  UPDATE todos SET section = 'Normal' WHERE section = 'Horizon Sync';
  UPDATE todos SET section = 'Later' WHERE section = 'Nadir Drift';
`);

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value);
}
