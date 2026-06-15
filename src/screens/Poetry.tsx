import React, { useState } from 'react';
import { api, type Poem } from '../api/client';
import { useResource } from '../hooks/useResource';
import { Plus, Star, Trash2, X, Upload, Pencil } from 'lucide-react';

export function Poetry() {
  const { data: poems, reload } = useResource<Poem[]>('/api/poetry');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [langFilter, setLangFilter] = useState<'All' | 'Hindi' | 'English'>('All');
  const [editingId, setEditingId] = useState<number | null>(null);

  async function toggleFeatured(p: Poem) {
    await api.patch(`/api/poetry/${p.id}`, { featured: !p.featured });
    await reload();
  }

  async function deletePoem(id: number) {
    if (!confirm('Delete this poem?')) return;
    await api.del(`/api/poetry/${id}`);
    await reload();
  }

  const list = poems ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-5xl md:text-6xl text-on-surface mb-4 tracking-tight">My Poetry</h1>
          <p className="text-on-surface-variant text-lg opacity-60 max-w-2xl leading-relaxed">Write, save, and revisit your poems.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => { setShowImport(s => !s); setShowAdd(false); }}
            className="px-6 py-3 bg-white/5 text-on-surface-variant border border-white/10 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-white/10 hover:text-on-surface transition-all whitespace-nowrap"
          >
            {showImport ? <X size={14} /> : <Upload size={14} />}
            {showImport ? 'Cancel' : 'Import from Keep'}
          </button>
          <button
            onClick={() => { setShowAdd(s => !s); setShowImport(false); }}
            className="px-6 py-3 bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-tertiary hover:text-on-tertiary transition-all whitespace-nowrap"
          >
            {showAdd ? <X size={14} /> : <Plus size={14} />}
            {showAdd ? 'Cancel' : 'New Poem'}
          </button>
        </div>
      </header>

      {showImport && <ImportForm onDone={async () => { setShowImport(false); await reload(); }} />}
      {showAdd && <PoemForm onSubmit={async () => { setShowAdd(false); await reload(); }} />}

      {list.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {(['All', 'English', 'Hindi'] as const).map(lang => {
            const count = lang === 'All' ? list.length : list.filter(p => p.language === lang).length;
            return (
              <button
                key={lang}
                onClick={() => setLangFilter(lang)}
                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                  langFilter === lang
                    ? 'bg-tertiary/20 text-tertiary border border-tertiary/30'
                    : 'bg-white/5 text-on-surface-variant hover:bg-white/10 border border-transparent'
                }`}
              >
                {lang} <span className="opacity-50 ml-1">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-12">
        {list.length === 0 && <p className="text-on-surface-variant opacity-40 italic">No poems yet.</p>}
        {list
          .filter(p => langFilter === 'All' || p.language === langFilter)
          .map(p => editingId === p.id ? (
            <PoemEditForm key={p.id} poem={p} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await reload(); }} />
          ) : (
            <PoemCard
              key={p.id}
              poem={p}
              onToggleFeatured={() => toggleFeatured(p)}
              onDelete={() => deletePoem(p.id)}
              onEdit={() => setEditingId(p.id)}
            />
          ))}
      </div>
    </div>
  );
}

function PoemForm({ onSubmit, initial, onCancel }: { onSubmit: () => void; initial?: Poem; onCancel?: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [date, setDate] = useState(initial?.written_on ?? new Date().toISOString().slice(0, 10));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const payload = { title: title.trim(), body, written_on: date, featured };
    if (initial) {
      await api.patch(`/api/poetry/${initial.id}`, payload);
    } else {
      await api.post('/api/poetry', payload);
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className={`glass-panel rounded-[2rem] p-8 space-y-4 animate-in slide-in-from-top-2 ${initial ? 'border-tertiary/30' : ''}`}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Poem title" autoFocus className="w-full bg-transparent text-2xl font-display border-b border-white/10 py-2 focus:outline-none focus:border-tertiary/30" />
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your poem..." rows={6} className="w-full bg-transparent border border-white/5 rounded-xl py-3 px-4 font-display italic text-lg text-on-surface-variant focus:outline-none focus:border-tertiary/30 resize-y" />
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
        <label className="text-xs text-on-surface-variant flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} />
          Feature
        </label>
        <div className="flex gap-2 ml-auto">
          {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest hover:text-on-surface">Cancel</button>}
          <button type="submit" disabled={!title.trim() || !body.trim()} className="px-6 py-2 bg-tertiary text-on-tertiary rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-40">Save</button>
        </div>
      </div>
    </form>
  );
}

function PoemEditForm({ poem, onCancel, onSaved }: { poem: Poem; onCancel: () => void; onSaved: () => void }) {
  return <PoemForm initial={poem} onSubmit={onSaved} onCancel={onCancel} />;
}

function ImportForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: { source: string; reason: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/poetry/import-keep', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status}: ${txt}`);
      }
      const data = await res.json();
      setResult({ imported: data.imported_count, skipped: data.skipped ?? [] });
      setFile(null);
      if (data.imported_count > 0) {
        setTimeout(() => onDone(), 1500);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith('.zip')) setFile(f);
    else setError('Please drop a .zip file from Google Takeout.');
  }

  return (
    <form onSubmit={handleImport} className="glass-panel rounded-[2rem] p-8 space-y-6 animate-in slide-in-from-top-2 border-white/10">
      <div>
        <h3 className="font-display text-2xl text-primary mb-2">Import from Google Keep</h3>
        <ol className="text-sm text-on-surface-variant opacity-70 leading-relaxed list-decimal list-inside space-y-1">
          <li>Open <a href="https://takeout.google.com/" target="_blank" rel="noreferrer" className="text-tertiary underline">takeout.google.com</a> and sign in.</li>
          <li>Click <span className="text-on-surface">"Deselect all"</span>, then tick only <span className="text-on-surface">Keep</span>.</li>
          <li>Choose <span className="font-mono">.zip</span> as the format and click <span className="text-on-surface">Create export</span>.</li>
          <li>Once Google emails you the download, save the zip and drop it below.</li>
        </ol>
      </div>

      <label
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragOver ? 'border-tertiary bg-tertiary/5' : 'border-white/10 hover:border-tertiary/30 hover:bg-white/[0.02]'
        }`}
      >
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {file ? (
          <div>
            <p className="font-display text-xl text-tertiary mb-1">{file.name}</p>
            <p className="text-xs text-on-surface-variant opacity-60">{(file.size / 1024 / 1024).toFixed(2)} MB — click to choose a different file</p>
          </div>
        ) : (
          <div>
            <p className="font-display text-xl text-on-surface mb-2">Drop your Takeout .zip here</p>
            <p className="text-xs text-on-surface-variant opacity-60">or click to browse</p>
          </div>
        )}
      </label>

      {result && (
        <div className="px-4 py-3 bg-tertiary/10 border border-tertiary/20 rounded-xl text-sm">
          <p className="text-tertiary font-bold">Imported {result.imported} poem{result.imported === 1 ? '' : 's'} from Keep.</p>
          {result.skipped.length > 0 && (
            <details className="mt-2">
              <summary className="text-on-surface-variant text-xs opacity-70 cursor-pointer">Skipped {result.skipped.length} note{result.skipped.length === 1 ? '' : 's'}</summary>
              <ul className="mt-2 space-y-1 text-[11px] text-on-surface-variant opacity-60 max-h-40 overflow-y-auto">
                {result.skipped.map((s, i) => (
                  <li key={i} className="font-mono">{s.source.split('/').pop()} — {s.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm whitespace-pre-wrap break-words">{error}</div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs text-on-surface-variant opacity-50">
          {file ? 'Ready to import.' : 'Select a Google Takeout .zip to begin.'}
        </span>
        <button
          type="submit"
          disabled={submitting || !file}
          className="px-6 py-2 bg-tertiary text-on-tertiary rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Importing…' : 'Import'}
        </button>
      </div>
    </form>
  );
}

function PoemCard({ poem, onToggleFeatured, onDelete, onEdit }: { poem: Poem; onToggleFeatured: () => void; onDelete: () => void; onEdit: () => void }) {
  return (
    <article className={`${poem.featured ? 'glass-panel p-12 md:p-20 border-tertiary/20' : 'glass-panel p-10 border-white/5'} rounded-[3rem] transition-all duration-1000 hover:border-tertiary/30 group relative overflow-hidden`}>
      {poem.featured && <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-tertiary/[0.03] rounded-full blur-[120px] -m-48"></div>}
      <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button onClick={onToggleFeatured} className={`${poem.featured ? 'text-tertiary' : 'text-on-surface-variant'} hover:scale-110 transition`} aria-label="Feature">
          <Star size={16} fill={poem.featured ? 'currentColor' : 'none'} />
        </button>
        <button onClick={onEdit} className="text-on-surface-variant hover:text-tertiary transition" aria-label="Edit">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="text-on-surface-variant hover:text-error transition" aria-label="Delete">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="relative z-10 text-center md:text-left">
        <div className="mb-4 flex justify-center md:justify-start">
          <span className={`text-[10px] uppercase font-bold tracking-[0.3em] px-3 py-1 rounded-full ${
            poem.language === 'Hindi'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-tertiary/10 text-tertiary border border-tertiary/20'
          }`}>
            {poem.language}
          </span>
        </div>
        <h2 className="font-display text-3xl md:text-4xl text-primary mb-10 group-hover:text-tertiary transition-colors duration-700">{poem.title}</h2>
        <div className="space-y-4">
          {poem.lines.map((line, i) => (
            <p key={i} className="font-display text-2xl md:text-3xl text-on-surface-variant italic leading-normal opacity-80">{line || ' '}</p>
          ))}
        </div>
        <div className="mt-16 flex justify-between items-center opacity-30 text-[10px] uppercase tracking-widest font-bold">
          <span className="flex items-center gap-2">
            <span className="w-1 h-1 bg-tertiary rounded-full"></span>
            {poem.written_on}
          </span>
        </div>
      </div>
    </article>
  );
}
