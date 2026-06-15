import React, { useMemo, useState } from 'react';
import { api, type Book } from '../api/client';
import { useResource } from '../hooks/useResource';
import { Plus, Search, Star, Trash2, X, Pencil } from 'lucide-react';

const PRESET_GENRES = [
  'Fiction',
  'Non-fiction',
  'Sci-Fi',
  'Fantasy',
  'Mystery',
  'Biography',
  'History',
  'Philosophy',
  'Science',
  'Cosmology',
  'Productivity',
  'Self-help',
  'Poetry',
  'Essay',
  'Design',
] as const;

export function Reading() {
  const { data: books, reload } = useResource<Book[]>('/api/reading');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const list = books ?? [];
  const tags = useMemo(() => {
    const set = new Set<string>(['All']);
    list.forEach(b => b.tag && set.add(b.tag));
    return Array.from(set);
  }, [list]);

  const filtered = list.filter(b => {
    const tagOk = activeTag === 'All' || b.tag === activeTag;
    const q = query.trim().toLowerCase();
    const qOk = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.excerpt.toLowerCase().includes(q);
    return tagOk && qOk;
  });

  async function toggleStar(b: Book) {
    await api.patch(`/api/reading/${b.id}`, { starred: !b.starred });
    await reload();
  }

  async function deleteBook(id: number) {
    if (!confirm('Remove this entry from your library?')) return;
    await api.del(`/api/reading/${id}`);
    await reload();
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search your library..."
            className="w-full bg-white/5 border-b border-white/10 py-4 pl-12 pr-4 focus:outline-none focus:border-tertiary/50 transition-all font-sans text-on-surface placeholder:text-on-surface-variant/40"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={18} />
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="px-6 py-3 bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-tertiary hover:text-on-tertiary transition-all whitespace-nowrap"
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Cancel' : 'Add Book'}
        </button>
      </div>

      {showAdd && <BookForm onSubmit={async () => { setShowAdd(false); await reload(); }} />}

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {tags.map(t => (
          <button
            key={t}
            onClick={() => setActiveTag(t)}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTag === t ? 'bg-tertiary/20 text-tertiary border border-tertiary/30' : 'bg-white/5 text-on-surface-variant hover:bg-white/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 && (
          <p className="col-span-full text-on-surface-variant opacity-40 italic">
            {list.length === 0 ? 'No books yet.' : 'Nothing matches your filters.'}
          </p>
        )}
        {filtered.map(b => editingId === b.id ? (
          <BookEditCard key={b.id} book={b} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await reload(); }} />
        ) : (
          <BookCard key={b.id} book={b} onStar={() => toggleStar(b)} onDelete={() => deleteBook(b.id)} onEdit={() => setEditingId(b.id)} />
        ))}
      </div>
    </div>
  );
}

function BookForm({ onSubmit, initial, onCancel }: { onSubmit: () => void; initial?: Book; onCancel?: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [author, setAuthor] = useState(initial?.author ?? '');
  const [time, setTime] = useState(initial?.time_estimate ?? '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const initialGenreIsPreset = initial ? (PRESET_GENRES as readonly string[]).includes(initial.tag) : true;
  const [genre, setGenre] = useState<string>(initial ? (initialGenreIsPreset ? initial.tag : '__custom__') : 'Fiction');
  const [customGenre, setCustomGenre] = useState(initial && !initialGenreIsPreset ? initial.tag : '');
  const isCustom = genre === '__custom__';
  const finalGenre = isCustom ? customGenre.trim() : genre;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      author: author.trim(),
      time_estimate: time.trim(),
      excerpt: excerpt.trim(),
      tag: finalGenre || 'Uncategorized',
    };
    if (initial) {
      await api.patch(`/api/reading/${initial.id}`, payload);
    } else {
      await api.post('/api/reading', payload);
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className={`glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-2 ${initial ? 'border-tertiary/30' : ''}`}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" autoFocus className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30 md:col-span-2" />
      <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author / Source" className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      <input value={time} onChange={e => setTime(e.target.value)} placeholder='Time estimate (e.g. "12 min read")' className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Genre</label>
          <select value={genre} onChange={e => setGenre(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30">
            {PRESET_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            <option value="__custom__">Custom…</option>
          </select>
        </div>
        {isCustom && (
          <div>
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1">Custom Genre</label>
            <input value={customGenre} onChange={e => setCustomGenre(e.target.value)} placeholder="e.g. Cyberpunk" autoFocus className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
          </div>
        )}
      </div>
      <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Excerpt or summary..." rows={3} className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30 md:col-span-2 resize-none" />
      <div className="md:col-span-2 flex gap-2 justify-end">
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest hover:text-on-surface">Cancel</button>}
        <button type="submit" disabled={!title.trim() || (isCustom && !customGenre.trim())} className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-40">{initial ? 'Save' : 'Add to Library'}</button>
      </div>
    </form>
  );
}

function BookEditCard({ book, onCancel, onSaved }: { book: Book; onCancel: () => void; onSaved: () => void }) {
  return <BookForm initial={book} onSubmit={onSaved} onCancel={onCancel} />;
}

function BookCard({ book, onStar, onDelete, onEdit }: { book: Book; onStar: () => void; onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="glass-card rounded-3xl p-8 flex flex-col justify-between min-h-[220px] hover:border-tertiary/20 transition-all duration-500 group relative">
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} aria-label="Edit" className="text-on-surface-variant hover:text-tertiary transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} aria-label="Delete" className="text-on-surface-variant hover:text-error transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      <div>
        <div className="flex justify-between items-start mb-6">
          <div className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-lg">📖</div>
          <button onClick={onStar} aria-label="Star" className={`transition-colors ${book.starred ? 'text-tertiary' : 'text-on-surface-variant opacity-30 hover:opacity-100'}`}>
            <Star size={16} fill={book.starred ? 'currentColor' : 'none'} />
          </button>
        </div>
        <span className="inline-block text-[10px] uppercase font-bold text-tertiary/60 tracking-[0.3em] mb-3">{book.tag}</span>
        <h3 className="font-display text-2xl text-primary mb-3 leading-tight">{book.title}</h3>
        {book.excerpt && <p className="text-sm text-on-surface-variant opacity-70 leading-relaxed font-sans">{book.excerpt}</p>}
      </div>
      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
        <span>{book.author || '—'}</span>
        <span className="text-tertiary">{book.time_estimate}</span>
      </div>
    </div>
  );
}
