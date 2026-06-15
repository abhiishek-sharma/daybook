import { Router } from 'express';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import { todayLocal } from '../dates.js';
import { zipUpload } from '../upload.js';
import { isKeepEntry, parseKeepEntry } from '../keep.js';

export const poetryRouter = Router();
poetryRouter.use(requireAuth);

interface PoemRow {
  id: number;
  title: string;
  body: string;
  written_on: string;
  featured: number;
  language: string;
}

const DEVANAGARI = /[ऀ-ॿ]/;

function detectLanguage(text: string): 'Hindi' | 'English' {
  return DEVANAGARI.test(text) ? 'Hindi' : 'English';
}

function transform(p: PoemRow) {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    lines: p.body.split('\n'),
    written_on: p.written_on,
    featured: !!p.featured,
    language: p.language,
  };
}

poetryRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM poems ORDER BY written_on DESC, id DESC').all() as PoemRow[];
  res.json(rows.map(transform));
});

poetryRouter.post('/', (req, res) => {
  const { title, body, written_on, featured } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  if (typeof body !== 'string' || !body.trim()) return res.status(400).json({ error: 'body required' });
  const date = typeof written_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(written_on) ? written_on : todayLocal();
  if (featured) db.prepare('UPDATE poems SET featured = 0').run();
  const language = detectLanguage(`${title}\n${body}`);
  const result = db.prepare('INSERT INTO poems(title, body, written_on, featured, language) VALUES(?, ?, ?, ?, ?)').run(
    title.trim(),
    body,
    date,
    featured ? 1 : 0,
    language
  );
  res.status(201).json(transform(db.prepare('SELECT * FROM poems WHERE id = ?').get(result.lastInsertRowid) as PoemRow));
});

poetryRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const existing = db.prepare('SELECT id FROM poems WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  if (req.body?.featured === true) {
    db.prepare('UPDATE poems SET featured = 0 WHERE id != ?').run(id);
  }
  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof req.body?.title === 'string') { fields.push('title = ?'); values.push(req.body.title); }
  if (typeof req.body?.body === 'string') { fields.push('body = ?'); values.push(req.body.body); }
  if (typeof req.body?.written_on === 'string') { fields.push('written_on = ?'); values.push(req.body.written_on); }
  if (typeof req.body?.featured === 'boolean') { fields.push('featured = ?'); values.push(req.body.featured ? 1 : 0); }
  if (typeof req.body?.title === 'string' || typeof req.body?.body === 'string') {
    const current = db.prepare('SELECT title, body FROM poems WHERE id = ?').get(id) as { title: string; body: string };
    const newTitle = typeof req.body?.title === 'string' ? req.body.title : current.title;
    const newBody = typeof req.body?.body === 'string' ? req.body.body : current.body;
    fields.push('language = ?');
    values.push(detectLanguage(`${newTitle}\n${newBody}`));
  }
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
  values.push(id);
  db.prepare(`UPDATE poems SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(transform(db.prepare('SELECT * FROM poems WHERE id = ?').get(id) as PoemRow));
});

poetryRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM poems WHERE id = ?').run(id);
  res.json({ ok: true });
});

poetryRouter.post('/import-keep', zipUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const uploadedPath = req.file.path;

  const cleanup = () => { try { fs.unlinkSync(uploadedPath); } catch { /* ignore */ } };

  let zip: AdmZip;
  try {
    zip = new AdmZip(uploadedPath);
  } catch (e) {
    cleanup();
    return res.status(400).json({ error: 'not a valid zip', detail: (e as Error).message });
  }

  const today = todayLocal();
  const insert = db.prepare('INSERT INTO poems(title, body, written_on, featured, language) VALUES(?, ?, ?, 0, ?)');
  const select = db.prepare('SELECT * FROM poems WHERE id = ?');

  const imported: PoemRow[] = [];
  const skipped: { source: string; reason: string }[] = [];
  const seen = new Set<string>();
  let scanned = 0;

  try {
    const tx = db.transaction(() => {
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const entryPath = entry.entryName;
        if (!isKeepEntry(entryPath)) continue;
        scanned += 1;

        const text = entry.getData().toString('utf8');
        const parsed = parseKeepEntry(entryPath, text, today);
        if (!parsed) { skipped.push({ source: entryPath, reason: 'no content' }); continue; }

        const dedupeKey = `${parsed.title}\n${parsed.body}`;
        if (seen.has(dedupeKey)) { skipped.push({ source: entryPath, reason: 'duplicate of earlier note' }); continue; }
        seen.add(dedupeKey);

        const lang = detectLanguage(`${parsed.title}\n${parsed.body}`);
        const result = insert.run(parsed.title, parsed.body, parsed.written_on, lang);
        imported.push(select.get(result.lastInsertRowid) as PoemRow);
      }
    });
    tx();
  } finally {
    cleanup();
  }

  res.json({
    notes_scanned: scanned,
    imported_count: imported.length,
    skipped_count: skipped.length,
    skipped,
    items: imported.map(transform),
  });
});

poetryRouter.post('/import', (req, res) => {
  const { text } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text required' });
  }

  const blocks = text.split(/^\s*---\s*$/m).map(b => b.trim()).filter(Boolean);
  if (blocks.length === 0) return res.status(400).json({ error: 'no poems found' });

  const today = todayLocal();
  const insert = db.prepare('INSERT INTO poems(title, body, written_on, featured, language) VALUES(?, ?, ?, 0, ?)');
  const select = db.prepare('SELECT * FROM poems WHERE id = ?');

  const imported: PoemRow[] = [];
  const skipped: string[] = [];

  const tx = db.transaction(() => {
    for (const block of blocks) {
      const lines = block.split('\n');
      const titleLine = lines.findIndex(l => l.trim().length > 0);
      if (titleLine === -1) { skipped.push('(empty block)'); continue; }
      const title = lines[titleLine].trim();
      const body = lines.slice(titleLine + 1).join('\n').trim();
      if (!body) { skipped.push(title); continue; }
      const lang = detectLanguage(`${title}\n${body}`);
      const result = insert.run(title, body, today, lang);
      imported.push(select.get(result.lastInsertRowid) as PoemRow);
    }
  });
  tx();

  res.json({
    imported_count: imported.length,
    skipped_count: skipped.length,
    skipped,
    items: imported.map(transform),
  });
});
