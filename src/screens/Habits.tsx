import React, { useState } from 'react';
import { api, type Habit, type HeatmapData } from '../api/client';
import { useResource } from '../hooks/useResource';
import { Plus, Trash2, Check, X, Pencil } from 'lucide-react';

export function Habits() {
  const { data: habits, reload: reloadHabits } = useResource<Habit[]>('/api/habits');
  const { data: heatmap, reload: reloadHeatmap } = useResource<HeatmapData>('/api/habits/heatmap');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('✨');
  const [editingId, setEditingId] = useState<number | null>(null);

  async function reloadAll() {
    await Promise.all([reloadHabits(), reloadHeatmap()]);
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.post('/api/habits', { name: newName.trim(), icon: newIcon });
    setNewName('');
    setNewIcon('✨');
    setShowAdd(false);
    await reloadAll();
  }

  async function toggleHabit(id: number) {
    await api.post(`/api/habits/${id}/toggle`);
    await reloadAll();
  }

  async function deleteHabit(id: number) {
    if (!confirm('Delete this habit and all its completions?')) return;
    await api.del(`/api/habits/${id}`);
    await reloadAll();
  }

  const list = habits ?? [];
  const heat = heatmap ?? { cells: [], streak: 0, total: 0 };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section className="glass-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/5 rounded-full blur-[100px]"></div>
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
          <div>
            <p className="font-sans text-xs text-tertiary mb-2 uppercase tracking-widest font-semibold">Overview</p>
            <h2 className="font-display text-4xl md:text-5xl text-on-surface mb-4 leading-tight">Habit Tracker</h2>
            <div className="flex gap-8">
              <div>
                <span className="block text-2xl font-display text-primary">{heat.streak} Day{heat.streak === 1 ? '' : 's'}</span>
                <span className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">Current Streak</span>
              </div>
              <div className="w-px h-10 bg-white/10 self-center"></div>
              <div>
                <span className="block text-2xl font-display text-primary">{heat.total.toLocaleString()}</span>
                <span className="text-xs font-sans text-on-surface-variant uppercase tracking-wider">Total Check-ins</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
          <div className="inline-grid grid-rows-7 grid-flow-col gap-2">
            {heat.cells.map(cell => (
              <div
                key={cell.date}
                title={`${cell.date} — ${cell.count} habit${cell.count === 1 ? '' : 's'} completed`}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${cell.count > 0 ? 'bg-tertiary' : 'bg-white/5'}`}
                style={{ opacity: cell.count > 0 ? 0.25 + cell.intensity * 0.75 : 1 }}
              />
            ))}
          </div>
        </div>
        {heat.cells.length > 0 && heat.total === 0 && (
          <p className="mt-6 text-xs text-on-surface-variant opacity-60 italic">No check-ins yet. Add a habit below, then tap the circle on its card to log today.</p>
        )}
      </section>

      <section className="flex justify-between items-center">
        <h3 className="font-display text-2xl text-primary">Your Habits</h3>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="px-6 py-3 bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-tertiary hover:text-on-tertiary transition-all duration-500 active:scale-95"
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Cancel' : 'New Habit'}
        </button>
      </section>

      {showAdd && (
        <form onSubmit={addHabit} className="glass-card rounded-2xl p-6 flex gap-4 items-center animate-in slide-in-from-top-2">
          <input
            type="text"
            value={newIcon}
            onChange={e => setNewIcon(e.target.value.slice(0, 2))}
            className="w-16 h-12 text-center text-2xl bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-tertiary/30"
            maxLength={2}
            aria-label="Icon"
          />
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Meditate, Read, Exercise"
            autoFocus
            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-tertiary/30 text-on-surface placeholder:text-on-surface-variant/30 font-sans"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-6 py-3 bg-tertiary text-on-tertiary rounded-xl font-bold uppercase text-[10px] tracking-widest disabled:opacity-40"
          >
            Create
          </button>
        </form>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.length === 0 && (
          <div className="col-span-full glass-card rounded-2xl p-12 text-center text-on-surface-variant">
            <p className="font-display text-xl opacity-60 mb-2">No habits yet</p>
            <p className="text-sm opacity-40">Tap "New Habit" to start tracking.</p>
          </div>
        )}
        {list.map(h => editingId === h.id ? (
          <HabitEditCard key={h.id} habit={h} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await reloadAll(); }} />
        ) : (
          <HabitCard
            key={h.id}
            habit={h}
            onToggle={() => toggleHabit(h.id)}
            onDelete={() => deleteHabit(h.id)}
            onEdit={() => setEditingId(h.id)}
          />
        ))}
      </section>
    </div>
  );
}

function HabitCard({ habit, onToggle, onDelete, onEdit }: { habit: Habit; onToggle: () => void; onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col gap-6 hover:border-tertiary/30 transition-all duration-500 group relative">
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} aria-label="Edit habit" className="text-on-surface-variant hover:text-tertiary transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} aria-label="Delete habit" className="text-on-surface-variant hover:text-error transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-2xl">
            {habit.icon}
          </div>
          <div>
            <h3 className="font-display text-xl text-on-surface">{habit.name}</h3>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider">Daily</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          aria-label={habit.completed_today ? 'Mark incomplete' : 'Mark complete'}
          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
            habit.completed_today
              ? 'bg-tertiary border-tertiary text-on-tertiary shadow-[0_0_15px_rgba(233,195,73,0.4)]'
              : 'border-tertiary/50 text-tertiary hover:bg-tertiary/10'
          }`}
        >
          <Check size={16} />
        </button>
      </div>
      <div className="flex justify-between items-end">
        <div>
          <span className="text-3xl font-display text-tertiary">{habit.streak}</span>
          <span className="ml-2 text-xs text-on-surface-variant">Day Streak</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-on-surface-variant opacity-60 block">Total</span>
          <span className="text-sm text-on-surface">{habit.total_completions}</span>
        </div>
      </div>
    </div>
  );
}

function HabitEditCard({ habit, onCancel, onSaved }: { habit: Habit; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(habit.name);
  const [icon, setIcon] = useState(habit.icon);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.patch(`/api/habits/${habit.id}`, { name: name.trim(), icon });
    onSaved();
  }

  return (
    <form onSubmit={save} className="glass-card rounded-2xl p-6 space-y-4 border-tertiary/30">
      <div className="flex gap-3">
        <input value={icon} onChange={e => setIcon(e.target.value.slice(0, 2))} maxLength={2} className="w-16 h-12 text-center text-2xl bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-tertiary/30" />
        <input value={name} onChange={e => setName(e.target.value)} autoFocus className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-tertiary/30" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest hover:text-on-surface">Cancel</button>
        <button type="submit" disabled={!name.trim()} className="px-4 py-2 bg-tertiary text-on-tertiary rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-40">Save</button>
      </div>
    </form>
  );
}
