import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const notesRouter = Router();
notesRouter.use(requireAuth);

notesRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM notes ORDER BY id DESC').all());
});

notesRouter.post('/', (req, res) => {
  const { title, body, category, image_url } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  if (typeof body !== 'string') return res.status(400).json({ error: 'body required' });
  const result = db.prepare('INSERT INTO notes(title, body, category, image_url) VALUES(?, ?, ?, ?)').run(
    title.trim(),
    body,
    (typeof category === 'string' && category) || 'Reflection',
    (typeof image_url === 'string' && image_url) || ''
  );
  res.status(201).json(db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid));
});

notesRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const existing = db.prepare('SELECT id FROM notes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ['title', 'body', 'category', 'image_url']) {
    if (typeof req.body?.[key] === 'string') {
      fields.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
  values.push(id);
  db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(id));
});

notesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  res.json({ ok: true });
});
