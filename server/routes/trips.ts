import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const tripsRouter = Router();
tripsRouter.use(requireAuth);

interface TripRow {
  id: number;
  title: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  image_url: string;
  depart_from: string;
  arrive_at: string;
  is_active: number;
  created_at: string;
}

function attachPrep(trips: TripRow[]) {
  const prep = db.prepare('SELECT * FROM trip_prep').all() as { id: number; trip_id: number; label: string; progress: number; missing_items: string }[];
  return trips.map(t => ({
    ...t,
    is_active: !!t.is_active,
    prep: prep.filter(p => p.trip_id === t.id).map(p => ({
      id: p.id,
      label: p.label,
      progress: p.progress,
      missing_items: p.missing_items ? p.missing_items.split('\n').filter(Boolean) : [],
    })),
  }));
}

tripsRouter.get('/', (_req, res) => {
  const trips = db.prepare('SELECT * FROM trips ORDER BY is_active DESC, start_date DESC, id DESC').all() as TripRow[];
  res.json(attachPrep(trips));
});

tripsRouter.post('/', (req, res) => {
  const { title, location, start_date, end_date, description, image_url, depart_from, arrive_at, is_active } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });

  if (is_active) {
    db.prepare('UPDATE trips SET is_active = 0').run();
  }

  const result = db.prepare(
    `INSERT INTO trips(title, location, start_date, end_date, description, image_url, depart_from, arrive_at, is_active)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    title.trim(),
    (typeof location === 'string' && location) || '',
    (typeof start_date === 'string' && start_date) || null,
    (typeof end_date === 'string' && end_date) || null,
    (typeof description === 'string' && description) || '',
    (typeof image_url === 'string' && image_url) || '',
    (typeof depart_from === 'string' && depart_from) || '',
    (typeof arrive_at === 'string' && arrive_at) || '',
    is_active ? 1 : 0
  );
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(result.lastInsertRowid) as TripRow;
  res.status(201).json(attachPrep([trip])[0]);
});

tripsRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const existing = db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  if (req.body?.is_active === true) {
    db.prepare('UPDATE trips SET is_active = 0 WHERE id != ?').run(id);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ['title', 'location', 'start_date', 'end_date', 'description', 'image_url', 'depart_from', 'arrive_at']) {
    if (typeof req.body?.[key] === 'string') {
      fields.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (typeof req.body?.is_active === 'boolean') {
    fields.push('is_active = ?');
    values.push(req.body.is_active ? 1 : 0);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
  values.push(id);
  db.prepare(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id) as TripRow;
  res.json(attachPrep([trip])[0]);
});

tripsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM trips WHERE id = ?').run(id);
  res.json({ ok: true });
});

tripsRouter.post('/:id/prep', (req, res) => {
  const tripId = Number(req.params.id);
  if (!Number.isFinite(tripId)) return res.status(400).json({ error: 'bad id' });
  const trip = db.prepare('SELECT id FROM trips WHERE id = ?').get(tripId);
  if (!trip) return res.status(404).json({ error: 'trip not found' });

  const { label, progress, missing_items } = req.body ?? {};
  if (typeof label !== 'string' || !label.trim()) return res.status(400).json({ error: 'label required' });
  const missing = Array.isArray(missing_items) ? missing_items.join('\n') : '';
  const result = db.prepare('INSERT INTO trip_prep(trip_id, label, progress, missing_items) VALUES(?, ?, ?, ?)').run(
    tripId,
    label.trim(),
    Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
    missing
  );
  const row = db.prepare('SELECT * FROM trip_prep WHERE id = ?').get(result.lastInsertRowid) as { id: number; label: string; progress: number; missing_items: string };
  res.status(201).json({
    id: row.id,
    label: row.label,
    progress: row.progress,
    missing_items: row.missing_items ? row.missing_items.split('\n').filter(Boolean) : [],
  });
});

tripsRouter.patch('/prep/:prepId', (req, res) => {
  const prepId = Number(req.params.prepId);
  if (!Number.isFinite(prepId)) return res.status(400).json({ error: 'bad id' });
  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof req.body?.label === 'string') {
    fields.push('label = ?');
    values.push(req.body.label);
  }
  if (typeof req.body?.progress === 'number') {
    fields.push('progress = ?');
    values.push(Math.max(0, Math.min(100, req.body.progress)));
  }
  if (Array.isArray(req.body?.missing_items)) {
    fields.push('missing_items = ?');
    values.push(req.body.missing_items.join('\n'));
  }
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
  values.push(prepId);
  db.prepare(`UPDATE trip_prep SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const row = db.prepare('SELECT * FROM trip_prep WHERE id = ?').get(prepId) as { id: number; label: string; progress: number; missing_items: string } | undefined;
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({
    id: row.id,
    label: row.label,
    progress: row.progress,
    missing_items: row.missing_items ? row.missing_items.split('\n').filter(Boolean) : [],
  });
});

tripsRouter.delete('/prep/:prepId', (req, res) => {
  const prepId = Number(req.params.prepId);
  if (!Number.isFinite(prepId)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM trip_prep WHERE id = ?').run(prepId);
  res.json({ ok: true });
});
