import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const todosRouter = Router();
todosRouter.use(requireAuth);

todosRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM todos ORDER BY completed ASC, id DESC').all();
  res.json(rows);
});

const VALID_SECTIONS = ['Priority', 'Normal', 'Later'] as const;

todosRouter.post('/', (req, res) => {
  const { text, subtext, section } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'text required' });
  const s = (VALID_SECTIONS as readonly string[]).includes(section) ? section : 'Normal';
  const result = db.prepare('INSERT INTO todos(text, subtext, section) VALUES(?, ?, ?)').run(text.trim(), (subtext ?? '').toString(), s);
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(todo);
});

todosRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as { completed: number } | undefined;
  if (!existing) return res.status(404).json({ error: 'not found' });

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof req.body?.completed === 'boolean') {
    fields.push('completed = ?');
    values.push(req.body.completed ? 1 : 0);
  }
  if (typeof req.body?.text === 'string') {
    fields.push('text = ?');
    values.push(req.body.text);
  }
  if (typeof req.body?.subtext === 'string') {
    fields.push('subtext = ?');
    values.push(req.body.subtext);
  }
  if (typeof req.body?.section === 'string') {
    fields.push('section = ?');
    values.push(req.body.section);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
  values.push(id);
  db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(id));
});

todosRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  res.json({ ok: true });
});
