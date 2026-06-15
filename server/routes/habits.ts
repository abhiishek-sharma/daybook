import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { formatLocal, todayLocal } from '../dates.js';

export const habitsRouter = Router();
habitsRouter.use(requireAuth);

interface HabitRow {
  id: number;
  name: string;
  icon: string;
  created_at: string;
}

function calculateStreak(dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const today = formatLocal(cursor);

  if (!dates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dates.has(formatLocal(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

habitsRouter.get('/', (_req, res) => {
  const habits = db.prepare('SELECT * FROM habits ORDER BY created_at ASC, id ASC').all() as HabitRow[];
  const completions = db.prepare('SELECT habit_id, completed_on FROM habit_completions').all() as { habit_id: number; completed_on: string }[];

  const byHabit = new Map<number, Set<string>>();
  for (const c of completions) {
    if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, new Set());
    byHabit.get(c.habit_id)!.add(c.completed_on);
  }

  const today = todayLocal();
  const enriched = habits.map(h => {
    const dates = byHabit.get(h.id) ?? new Set();
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      created_at: h.created_at,
      streak: calculateStreak(dates),
      completed_today: dates.has(today),
      total_completions: dates.size,
    };
  });

  res.json(enriched);
});

habitsRouter.post('/', (req, res) => {
  const { name, icon } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name required' });
  }
  const result = db.prepare('INSERT INTO habits(name, icon) VALUES(?, ?)').run(name.trim(), (typeof icon === 'string' && icon) || '✨');
  const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid) as HabitRow;
  res.status(201).json({ ...habit, streak: 0, completed_today: false, total_completions: 0 });
});

habitsRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const existing = db.prepare('SELECT id FROM habits WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof req.body?.name === 'string' && req.body.name.trim()) {
    fields.push('name = ?');
    values.push(req.body.name.trim());
  }
  if (typeof req.body?.icon === 'string' && req.body.icon) {
    fields.push('icon = ?');
    values.push(req.body.icon);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
  values.push(id);
  db.prepare(`UPDATE habits SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(id));
});

habitsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM habits WHERE id = ?').run(id);
  res.json({ ok: true });
});

habitsRouter.post('/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const habit = db.prepare('SELECT id FROM habits WHERE id = ?').get(id);
  if (!habit) return res.status(404).json({ error: 'habit not found' });

  const day = (typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)) ? req.body.date : todayLocal();
  const existing = db.prepare('SELECT id FROM habit_completions WHERE habit_id = ? AND completed_on = ?').get(id, day);

  if (existing) {
    db.prepare('DELETE FROM habit_completions WHERE habit_id = ? AND completed_on = ?').run(id, day);
    res.json({ completed: false, date: day });
  } else {
    db.prepare('INSERT INTO habit_completions(habit_id, completed_on) VALUES(?, ?)').run(id, day);
    res.json({ completed: true, date: day });
  }
});

habitsRouter.get('/heatmap', (_req, res) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 364);
  const sinceISO = formatLocal(since);

  const rows = db.prepare(`
    SELECT completed_on AS date, COUNT(*) AS count
    FROM habit_completions
    WHERE completed_on >= ?
    GROUP BY completed_on
  `).all(sinceISO) as { date: string; count: number }[];

  const map: Record<string, number> = {};
  for (const r of rows) map[r.date] = r.count;

  const totalHabits = (db.prepare('SELECT COUNT(*) AS c FROM habits').get() as { c: number }).c;

  const cells: { date: string; count: number; intensity: number }[] = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (364 - i));
    const iso = formatLocal(d);
    const count = map[iso] ?? 0;
    const intensity = totalHabits === 0 ? 0 : Math.min(1, count / totalHabits);
    cells.push({ date: iso, count, intensity });
  }

  const allDates = new Set(Object.keys(map));
  const overallStreak = calculateStreak(allDates);
  const totalObservations = rows.reduce((sum, r) => sum + r.count, 0);

  res.json({ cells, streak: overallStreak, total: totalObservations });
});
