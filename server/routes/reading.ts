import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const readingRouter = Router();
readingRouter.use(requireAuth);

readingRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM books ORDER BY starred DESC, id DESC').all());
});

readingRouter.post('/', (req, res) => {
  const { title, author, time_estimate, excerpt, tag } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  const result = db.prepare('INSERT INTO books(title, author, time_estimate, excerpt, tag) VALUES(?, ?, ?, ?, ?)').run(
    title.trim(),
    (typeof author === 'string' && author) || '',
    (typeof time_estimate === 'string' && time_estimate) || '',
    (typeof excerpt === 'string' && excerpt) || '',
    (typeof tag === 'string' && tag) || 'All Reads'
  );
  res.status(201).json(db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid));
});

readingRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of ['title', 'author', 'time_estimate', 'excerpt', 'tag']) {
    if (typeof req.body?.[key] === 'string') {
      fields.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  }
  if (typeof req.body?.starred === 'boolean') {
    fields.push('starred = ?');
    values.push(req.body.starred ? 1 : 0);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
  values.push(id);
  db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM books WHERE id = ?').get(id));
});

readingRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  res.json({ ok: true });
});
