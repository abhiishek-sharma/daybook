import React, { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { api, type Transaction, type FinanceSummary } from '../api/client';
import { useResource } from '../hooks/useResource';
import { Plus, Trash2, X, Pencil } from 'lucide-react';

export function Finance() {
  const { data: summary, reload: reloadSummary } = useResource<FinanceSummary>('/api/finance/summary');
  const { data: txs, reload: reloadTxs } = useResource<Transaction[]>('/api/finance/transactions');
  const [showAdd, setShowAdd] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function reloadAll() {
    await Promise.all([reloadSummary(), reloadTxs()]);
  }

  async function deleteTx(id: number) {
    await api.del(`/api/finance/transactions/${id}`);
    await reloadAll();
  }

  const s = summary ?? { totalWealth: 0, monthSpend: 0, monthlyCeiling: 5000, utilizedPct: 0, chart: [], priorMonthDelta: null };
  const list = txs ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-3xl p-8 flex flex-col justify-center min-h-[220px] relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-tertiary/5 rounded-full blur-[80px]"></div>
          <span className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold mb-2">Total Balance</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display text-tertiary">₹</span>
            <span className={`text-5xl font-display ${s.totalWealth < 0 ? 'text-error' : 'text-on-surface'}`}>{s.totalWealth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {s.priorMonthDelta !== null && (
            <div className={`mt-6 flex items-center gap-2 text-sm ${s.priorMonthDelta < 0 ? 'text-primary' : 'text-error'}`}>
              <span>{s.priorMonthDelta < 0 ? '↘' : '↗'} {Math.abs(s.priorMonthDelta).toFixed(1)}% from last month</span>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-3xl p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold mb-2 block">This Month</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display text-primary">₹</span>
                <span className="text-3xl font-display text-on-surface">{s.monthSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <button onClick={() => setEditingBudget(b => !b)} className="text-[10px] text-tertiary opacity-60 hover:opacity-100 uppercase tracking-widest">Edit</button>
          </div>
          {editingBudget ? (
            <BudgetEditor current={s.monthlyCeiling} onSave={async () => { setEditingBudget(false); await reloadSummary(); }} onCancel={() => setEditingBudget(false)} />
          ) : (
            <div className="mt-8">
              <div className="flex justify-between text-xs text-on-surface-variant uppercase mb-2">
                <span>Budget ₹{s.monthlyCeiling.toLocaleString('en-IN')}</span>
                <span className="text-tertiary">{s.utilizedPct}% used</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-tertiary/40 to-tertiary rounded-full shadow-[0_0_10px_rgba(233,195,73,0.3)] transition-all duration-500" style={{ width: `${s.utilizedPct}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-display text-2xl text-primary">Spending</h2>
          <span className="text-xs px-3 py-1 bg-tertiary/20 text-tertiary rounded-full font-bold">Last 30 Days</span>
        </div>
        <div className="h-48 w-full">
          {s.chart.length === 0 ? (
            <p className="text-on-surface-variant opacity-40 italic">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.chart}>
                <Tooltip
                  cursor={{ fill: 'rgba(233,195,73,0.05)' }}
                  contentStyle={{ background: '#1c1b1c', border: '1px solid rgba(233,195,73,0.2)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#e9c349' }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Spent']}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {s.chart.map((entry, i) => (
                    <Cell key={i} fill="#e9c349" fillOpacity={entry.total > 0 ? 0.8 : 0.15} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-2xl text-primary">Recent Transactions</h2>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="px-6 py-3 bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-tertiary hover:text-on-tertiary transition-all"
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
            {showAdd ? 'Cancel' : 'Add Transaction'}
          </button>
        </div>
        {showAdd && <TxForm onSubmit={async () => { setShowAdd(false); await reloadAll(); }} />}
        <div className="space-y-4">
          {list.length === 0 && <p className="text-on-surface-variant opacity-40 italic">No transactions yet.</p>}
          {list.slice(0, 50).map(t => editingId === t.id ? (
            <TxEditRow key={t.id} tx={t} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await reloadAll(); }} />
          ) : (
            <TransactionItem key={t.id} tx={t} onDelete={() => deleteTx(t.id)} onEdit={() => setEditingId(t.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BudgetEditor({ current, onSave, onCancel }: { current: number; onSave: () => void; onCancel: () => void }) {
  const [value, setValue] = useState(String(current));
  async function save() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    await api.put('/api/finance/budget', { monthly_ceiling: n });
    onSave();
  }
  return (
    <div className="mt-8 space-y-3">
      <label className="text-[10px] uppercase tracking-widest text-on-surface-variant">Monthly Budget (₹)</label>
      <div className="flex gap-2">
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-on-surface focus:outline-none focus:border-tertiary/30"
        />
        <button onClick={save} className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl text-xs font-bold uppercase tracking-widest">Save</button>
        <button onClick={onCancel} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest">Cancel</button>
      </div>
    </div>
  );
}

function TxForm({ onSubmit, initial, onCancel }: { onSubmit: () => void; initial?: Transaction; onCancel?: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [amount, setAmount] = useState(initial ? String(Math.abs(initial.amount)) : '');
  const [category, setCategory] = useState(initial?.category ?? 'Other');
  const [type, setType] = useState<'expense' | 'income'>(initial ? (initial.amount >= 0 ? 'income' : 'expense') : 'expense');
  const [date, setDate] = useState(initial?.occurred_on ?? new Date().toISOString().slice(0, 10));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!title.trim() || !Number.isFinite(n)) return;
    const signed = type === 'income' ? Math.abs(n) : -Math.abs(n);
    if (initial) {
      await api.patch(`/api/finance/transactions/${initial.id}`, {
        title: title.trim(),
        amount: signed,
        category,
        occurred_on: date,
      });
    } else {
      await api.post('/api/finance/transactions', {
        title: title.trim(),
        amount: signed,
        category,
        occurred_on: date,
      });
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className={`glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end animate-in slide-in-from-top-2 ${initial ? 'border-tertiary/30' : ''}`}>
      <div className="md:col-span-2">
        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Amount</label>
        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Type</label>
        <select value={type} onChange={e => setType(e.target.value as 'expense' | 'income')} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Category</label>
        <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      </div>
      <div className="md:col-span-2">
        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      </div>
      <div className="md:col-span-3 flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest hover:text-on-surface">Cancel</button>
        )}
        <button type="submit" disabled={!title.trim() || !amount} className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-40">{initial ? 'Save' : 'Add'}</button>
      </div>
    </form>
  );
}

function TxEditRow({ tx, onCancel, onSaved }: { tx: Transaction; onCancel: () => void; onSaved: () => void }) {
  return <TxForm initial={tx} onSubmit={onSaved} onCancel={onCancel} />;
}

function TransactionItem({ tx, onDelete, onEdit }: { tx: Transaction; onDelete: () => void; onEdit: () => void }) {
  const positive = tx.amount > 0;
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center justify-between group hover:bg-white/8 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl">
          {positive ? '💰' : '💸'}
        </div>
        <div>
          <p className="font-medium text-on-surface">{tx.title}</p>
          <p className="text-xs text-on-surface-variant opacity-60">{tx.occurred_on} • {tx.category}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`font-display text-lg ${positive ? 'text-tertiary' : 'text-on-surface'}`}>
            {positive ? '+' : '−'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-on-surface-variant hover:text-tertiary transition-colors" aria-label="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="text-on-surface-variant hover:text-error transition-colors" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
