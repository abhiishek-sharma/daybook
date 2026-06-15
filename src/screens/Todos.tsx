import React, { useState } from 'react';
import { api, type Todo } from '../api/client';
import { useResource } from '../hooks/useResource';
import { Plus, Trash2, Pencil } from 'lucide-react';

const SECTIONS = ['Priority', 'Normal', 'Later'] as const;
type Section = typeof SECTIONS[number];

const SECTION_COLORS: Record<Section, { dot: string; glow: string; text: string }> = {
  Priority: { dot: 'bg-error', glow: 'shadow-[0_0_8px_rgba(255,180,171,0.6)]', text: 'text-error' },
  Normal: { dot: 'bg-tertiary', glow: 'shadow-[0_0_8px_rgba(233,195,73,0.4)]', text: 'text-tertiary' },
  Later: { dot: 'bg-on-surface-variant/20', glow: '', text: 'text-on-surface-variant' },
};

export function Todos() {
  const { data: todos, reload } = useResource<Todo[]>('/api/todos');
  const [adding, setAdding] = useState<Section | null>(null);
  const [text, setText] = useState('');
  const [subtext, setSubtext] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  async function createTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !adding) return;
    await api.post('/api/todos', { text: text.trim(), subtext: subtext.trim(), section: adding });
    setText('');
    setSubtext('');
    setAdding(null);
    await reload();
  }

  async function toggleTodo(t: Todo) {
    await api.patch(`/api/todos/${t.id}`, { completed: !t.completed });
    await reload();
  }

  async function deleteTodo(id: number) {
    await api.del(`/api/todos/${id}`);
    await reload();
  }

  const list = todos ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-bottom-4 duration-700">
      <header className="mb-12">
        <h3 className="font-display text-3xl text-primary mb-2">Tasks</h3>
        <p className="text-on-surface-variant opacity-70 font-sans">Things to do, organized by priority.</p>
      </header>

      <div className="space-y-12">
        {SECTIONS.map(section => {
          const items = list.filter(t => t.section === section);
          const color = SECTION_COLORS[section];
          return (
            <section key={section} className="space-y-4">
              <div className="flex items-center justify-between mb-6 ml-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color.dot} ${color.glow}`}></div>
                  <p className={`text-xs uppercase tracking-[0.2em] font-bold ${color.text}`}>{section}</p>
                  <span className="text-[10px] text-on-surface-variant opacity-40 ml-2">({items.length})</span>
                </div>
                <button
                  onClick={() => setAdding(adding === section ? null : section)}
                  className="text-xs text-on-surface-variant opacity-60 hover:opacity-100 hover:text-tertiary transition-all flex items-center gap-1"
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              {adding === section && (
                <form onSubmit={createTodo} className="glass-card rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2">
                  <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    autoFocus
                    placeholder="Task"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-tertiary/30 text-on-surface placeholder:text-on-surface-variant/30 font-display text-lg"
                  />
                  <input
                    type="text"
                    value={subtext}
                    onChange={e => setSubtext(e.target.value)}
                    placeholder="Notes (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-tertiary/30 text-on-surface-variant placeholder:text-on-surface-variant/30 font-sans"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setAdding(null); setText(''); setSubtext(''); }} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest hover:text-on-surface">Cancel</button>
                    <button type="submit" disabled={!text.trim()} className="px-4 py-2 bg-tertiary text-on-tertiary rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-40">Save</button>
                  </div>
                </form>
              )}

              {items.length === 0 && adding !== section && (
                <p className="text-xs text-on-surface-variant opacity-30 italic ml-4">No tasks here.</p>
              )}

              {items.map(t => editingId === t.id ? (
                <TodoEditRow key={t.id} todo={t} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await reload(); }} />
              ) : (
                <TodoItemRow
                  key={t.id}
                  todo={t}
                  onToggle={() => toggleTodo(t)}
                  onDelete={() => deleteTodo(t.id)}
                  onEdit={() => setEditingId(t.id)}
                />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TodoItemRow({ todo, onToggle, onDelete, onEdit }: { todo: Todo; onToggle: () => void; onDelete: () => void; onEdit: () => void }) {
  const completed = !!todo.completed;
  return (
    <div className={`glass-card rounded-2xl p-6 transition-all duration-300 group ${completed ? 'opacity-40' : 'hover:bg-white/8'}`}>
      <div className="flex items-center gap-5">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${completed ? 'bg-tertiary border-tertiary' : 'border-white/20 hover:border-tertiary'}`}
          aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {completed && <span className="text-on-tertiary text-xs">✓</span>}
        </button>
        <div className="flex-1 cursor-pointer" onClick={onToggle}>
          <h4 className={`text-lg font-display ${completed ? 'line-through' : ''}`}>{todo.text}</h4>
          {todo.subtext && <p className="text-xs text-on-surface-variant opacity-60 font-sans mt-0.5">{todo.subtext}</p>}
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

function TodoEditRow({ todo, onCancel, onSaved }: { todo: Todo; onCancel: () => void; onSaved: () => void }) {
  const [text, setText] = useState(todo.text);
  const [subtext, setSubtext] = useState(todo.subtext);
  const [section, setSection] = useState<Section>(todo.section as Section);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await api.patch(`/api/todos/${todo.id}`, { text: text.trim(), subtext: subtext.trim(), section });
    onSaved();
  }

  return (
    <form onSubmit={save} className="glass-card rounded-2xl p-4 space-y-3 border-tertiary/30">
      <input value={text} onChange={e => setText(e.target.value)} autoFocus className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-tertiary/30 text-on-surface font-display text-lg" />
      <input value={subtext} onChange={e => setSubtext(e.target.value)} placeholder="Notes (optional)" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-tertiary/30" />
      <div className="flex justify-between items-center gap-2">
        <select value={section} onChange={e => setSection(e.target.value as Section)} className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-tertiary/30">
          {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest hover:text-on-surface">Cancel</button>
          <button type="submit" disabled={!text.trim()} className="px-4 py-2 bg-tertiary text-on-tertiary rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-40">Save</button>
        </div>
      </div>
    </form>
  );
}
