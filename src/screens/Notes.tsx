import React, { useState } from 'react';
import { api, type Note } from '../api/client';
import { useResource } from '../hooks/useResource';
import { Trash2, Pencil } from 'lucide-react';

const CATEGORIES = ['General', 'Idea', 'Reference', 'Journal', 'Quote'] as const;

export function Notes() {
  const { data: notes, reload } = useResource<Note[]>('/api/notes');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function capture(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/api/notes', { title: title.trim() || 'Untitled', body, category });
      setTitle('');
      setBody('');
      setCategory('General');
      await reload();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(id: number) {
    if (!confirm('Delete this note?')) return;
    await api.del(`/api/notes/${id}`);
    await reload();
  }

  const list = notes ?? [];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl text-tertiary mb-2">Notes</h1>
          <p className="text-on-surface-variant text-lg opacity-60 max-w-xl">Quick notes and thoughts.</p>
        </div>
      </header>

      <form onSubmit={capture} className="glass-panel rounded-[2.5rem] p-10 border-tertiary/10 relative overflow-hidden focus-within:border-tertiary/30 transition-all duration-700">
        <div className="absolute inset-0 bg-white/[0.01] pointer-events-none"></div>
        <div className="relative z-10">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title..."
            className="w-full bg-transparent border-none p-0 font-display text-3xl text-on-surface placeholder:text-on-surface-variant/20 focus:ring-0 mb-6"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write..."
            className="w-full bg-transparent border-none p-0 text-xl md:text-2xl min-h-[160px] focus:ring-0 placeholder:text-on-surface-variant/20 resize-none font-sans"
          />
          <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center gap-4 flex-wrap">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-on-surface-variant focus:outline-none focus:border-tertiary/30"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              type="submit"
              disabled={submitting || (!title.trim() && !body.trim())}
              className="bg-tertiary text-on-tertiary px-10 py-4 rounded-full font-bold uppercase text-[10px] tracking-widest hover:scale-[1.02] transition-all duration-500 shadow-xl shadow-tertiary/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>
      </form>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        {list.length === 0 && (
          <p className="text-on-surface-variant opacity-40 italic">No notes yet.</p>
        )}
        {list.map(n => editingId === n.id ? (
          <NoteEditCard key={n.id} note={n} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await reload(); }} />
        ) : (
          <NoteCard key={n.id} note={n} onDelete={() => deleteNote(n.id)} onEdit={() => setEditingId(n.id)} />
        ))}
      </div>
    </div>
  );
}

function NoteCard({ note, onDelete, onEdit }: { note: Note; onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="glass-panel rounded-[2.5rem] p-10 border-white/5 hover:border-tertiary/20 transition-all duration-700 break-inside-avoid group shadow-xl relative">
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} aria-label="Edit" className="text-on-surface-variant hover:text-tertiary transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} aria-label="Delete" className="text-on-surface-variant hover:text-error transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex justify-between items-start mb-6">
        <span className="text-[10px] uppercase font-bold text-tertiary/40 tracking-[0.3em]">{note.category}</span>
      </div>
      <h3 className="font-display text-2xl text-on-surface mb-4 leading-snug">{note.title}</h3>
      <p className="text-on-surface-variant opacity-75 text-base leading-relaxed font-sans whitespace-pre-wrap">{note.body}</p>
      <p className="mt-6 text-[10px] text-on-surface-variant opacity-30 uppercase tracking-widest">{new Date(note.created_at).toLocaleDateString()}</p>
    </div>
  );
}

function NoteEditCard({ note, onCancel, onSaved }: { note: Note; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [category, setCategory] = useState(note.category);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    await api.patch(`/api/notes/${note.id}`, { title: title.trim() || 'Untitled', body, category });
    onSaved();
  }

  return (
    <form onSubmit={save} className="glass-panel rounded-[2.5rem] p-8 border-tertiary/30 break-inside-avoid space-y-4">
      <input value={title} onChange={e => setTitle(e.target.value)} autoFocus className="w-full bg-transparent border-b border-white/10 font-display text-2xl text-on-surface focus:outline-none focus:border-tertiary/30 py-2" />
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-base text-on-surface focus:outline-none focus:border-tertiary/30 resize-y" />
      <div className="flex justify-between items-center gap-2">
        <select value={category} onChange={e => setCategory(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs focus:outline-none focus:border-tertiary/30">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          {!(CATEGORIES as readonly string[]).includes(category) && <option value={category}>{category}</option>}
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest hover:text-on-surface">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-tertiary text-on-tertiary rounded-lg text-xs font-bold uppercase tracking-widest">Save</button>
        </div>
      </div>
    </form>
  );
}
