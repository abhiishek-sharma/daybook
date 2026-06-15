import { Router } from 'express';
import { db, getSetting, setSetting } from '../db.js';
import { requireAuth } from '../auth.js';
import { formatLocal, todayLocal, monthPrefixLocal } from '../dates.js';

export const financeRouter = Router();
financeRouter.use(requireAuth);

interface TxRow {
  id: number;
  title: string;
  amount: number;
  category: string;
  occurred_on: string;
}

financeRouter.get('/transactions', (_req, res) => {
  res.json(db.prepare('SELECT * FROM transactions ORDER BY occurred_on DESC, id DESC').all());
});

financeRouter.post('/transactions', (req, res) => {
  const { title, amount, category, occurred_on } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'title required' });
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return res.status(400).json({ error: 'amount must be number' });
  const date = typeof occurred_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(occurred_on) ? occurred_on : todayLocal();
  const result = db.prepare('INSERT INTO transactions(title, amount, category, occurred_on) VALUES(?, ?, ?, ?)').run(
    title.trim(),
    amount,
    (typeof category === 'string' && category) || 'Other',
    date
  );
  res.status(201).json(db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid));
});

financeRouter.patch('/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof req.body?.title === 'string' && req.body.title.trim()) { fields.push('title = ?'); values.push(req.body.title.trim()); }
  if (typeof req.body?.amount === 'number' && Number.isFinite(req.body.amount)) { fields.push('amount = ?'); values.push(req.body.amount); }
  if (typeof req.body?.category === 'string') { fields.push('category = ?'); values.push(req.body.category); }
  if (typeof req.body?.occurred_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.occurred_on)) { fields.push('occurred_on = ?'); values.push(req.body.occurred_on); }
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });
  values.push(id);
  db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM transactions WHERE id = ?').get(id));
});

financeRouter.delete('/transactions/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'bad id' });
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  res.json({ ok: true });
});

financeRouter.get('/summary', (_req, res) => {
  const txs = db.prepare('SELECT * FROM transactions').all() as TxRow[];
  const totalWealth = txs.reduce((sum, t) => sum + t.amount, 0);

  const now = new Date();
  const monthPrefix = monthPrefixLocal(now);
  const monthSpend = txs
    .filter(t => t.occurred_on.startsWith(monthPrefix) && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const monthlyCeiling = Number(getSetting('monthly_ceiling') ?? '5000');
  const utilizedPct = monthlyCeiling > 0 ? Math.min(100, Math.round((monthSpend / monthlyCeiling) * 100)) : 0;

  const buckets: { date: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const iso = formatLocal(d);
    const spent = txs
      .filter(t => t.occurred_on === iso && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    buckets.push({ date: iso, total: spent });
  }

  let priorMonthDelta: number | null = null;
  const prior = new Date(now);
  prior.setMonth(prior.getMonth() - 1);
  const priorPrefix = monthPrefixLocal(prior);
  const priorSpend = txs
    .filter(t => t.occurred_on.startsWith(priorPrefix) && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  if (priorSpend > 0) {
    priorMonthDelta = ((monthSpend - priorSpend) / priorSpend) * 100;
  }

  res.json({
    totalWealth,
    monthSpend,
    monthlyCeiling,
    utilizedPct,
    chart: buckets,
    priorMonthDelta,
  });
});

financeRouter.put('/budget', (req, res) => {
  const { monthly_ceiling } = req.body ?? {};
  if (typeof monthly_ceiling !== 'number' || monthly_ceiling < 0) {
    return res.status(400).json({ error: 'monthly_ceiling must be a non-negative number' });
  }
  setSetting('monthly_ceiling', String(monthly_ceiling));
  res.json({ monthly_ceiling });
});
