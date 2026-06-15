import React, { useState } from 'react';
import { api, type Trip } from '../api/client';
import { useResource } from '../hooks/useResource';
import { Plus, Trash2, X, MapPin, Pencil } from 'lucide-react';

export function Trips() {
  const { data: trips, reload } = useResource<Trip[]>('/api/trips');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const list = trips ?? [];
  const active = list.find(t => t.is_active);
  const others = list.filter(t => !t.is_active);

  async function activate(id: number) {
    await api.patch(`/api/trips/${id}`, { is_active: true });
    await reload();
  }

  async function deleteTrip(id: number) {
    if (!confirm('Delete this trip?')) return;
    await api.del(`/api/trips/${id}`);
    await reload();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in zoom-in-95 duration-700">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-3xl text-primary">Trips</h1>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="px-6 py-3 bg-tertiary/10 text-tertiary border border-tertiary/20 rounded-full font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-tertiary hover:text-on-tertiary transition-all"
        >
          {showAdd ? <X size={14} /> : <Plus size={14} />}
          {showAdd ? 'Cancel' : 'Add Trip'}
        </button>
      </div>

      {showAdd && <TripForm onSubmit={async () => { setShowAdd(false); await reload(); }} />}

      {editingId !== null && active && editingId === active.id ? (
        <TripEditForm trip={active} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await reload(); }} />
      ) : active ? (
        <ActiveTripHero trip={active} onPrepChange={reload} onDelete={() => deleteTrip(active.id)} onEdit={() => setEditingId(active.id)} />
      ) : (
        <div className="glass-panel rounded-[3rem] p-16 text-center">
          <p className="text-on-surface-variant opacity-60 italic">No active trip. {list.length === 0 ? 'Add one above to begin.' : 'Activate one below or add a new one.'}</p>
        </div>
      )}

      {others.length > 0 && (
        <section>
          <h3 className="font-display text-xl text-primary mb-6">Other Trips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {others.map(t => editingId === t.id ? (
              <TripEditForm key={t.id} trip={t} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await reload(); }} />
            ) : (
              <TripSummaryCard
                key={t.id}
                trip={t}
                onActivate={() => activate(t.id)}
                onDelete={() => deleteTrip(t.id)}
                onEdit={() => setEditingId(t.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ActiveTripHero({ trip, onPrepChange, onDelete, onEdit }: { trip: Trip; onPrepChange: () => Promise<void>; onDelete: () => void; onEdit: () => void }) {
  const [addingPrep, setAddingPrep] = useState(false);
  const [prepLabel, setPrepLabel] = useState('');
  const [prepProgress, setPrepProgress] = useState(0);
  const dateRange = trip.start_date && trip.end_date ? `${trip.start_date} — ${trip.end_date}` : trip.start_date ?? '';

  async function addPrep(e: React.FormEvent) {
    e.preventDefault();
    if (!prepLabel.trim()) return;
    await api.post(`/api/trips/${trip.id}/prep`, { label: prepLabel.trim(), progress: prepProgress });
    setPrepLabel('');
    setPrepProgress(0);
    setAddingPrep(false);
    await onPrepChange();
  }

  async function updateProgress(prepId: number, delta: number) {
    const item = trip.prep.find(p => p.id === prepId);
    if (!item) return;
    const next = Math.max(0, Math.min(100, item.progress + delta));
    await api.patch(`/api/trips/prep/${prepId}`, { progress: next });
    await onPrepChange();
  }

  async function removePrep(prepId: number) {
    await api.del(`/api/trips/prep/${prepId}`);
    await onPrepChange();
  }

  return (
    <>
      <div className="relative rounded-[3rem] overflow-hidden h-[500px] glass-panel group shadow-2xl border-none">
        {trip.image_url ? (
          <img alt={trip.title} src={trip.image_url} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-container via-surface to-surface-container-low" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
        <div className="absolute top-6 right-6 flex gap-2">
          <button onClick={onEdit} className="px-4 py-2 bg-black/30 backdrop-blur-md text-on-surface-variant text-[10px] uppercase tracking-widest rounded-full hover:text-tertiary transition-colors flex items-center gap-1">
            <Pencil size={12} /> Edit
          </button>
          <button onClick={onDelete} className="px-4 py-2 bg-black/30 backdrop-blur-md text-on-surface-variant text-[10px] uppercase tracking-widest rounded-full hover:text-error transition-colors">Delete</button>
        </div>
        <div className="absolute bottom-0 left-0 p-12 w-full flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3 text-tertiary">
              <MapPin size={14} />
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Active Trip</span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl text-on-surface leading-tight mb-4 tracking-tight">{trip.title}</h2>
            {dateRange && <p className="text-on-surface-variant text-xl opacity-80 leading-relaxed font-sans">{dateRange}{trip.description ? ` • ${trip.description}` : ''}</p>}
            {trip.location && <p className="text-on-surface-variant mt-2 opacity-60">{trip.location}</p>}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel rounded-[2rem] p-10 min-h-[400px]">
          <h3 className="font-display text-2xl text-primary mb-8">Route</h3>
          <div className="w-full h-64 border border-white/5 rounded-2xl relative flex items-center justify-center p-8">
            <svg className="w-full h-full stroke-tertiary/20 fill-none" viewBox="0 0 100 50">
              <path d="M10,40 Q40,10 60,30 T90,20" strokeDasharray="2 2" />
              <circle cx="10" cy="40" r="1.5" fill="#e9c349" className="animate-pulse" />
              <circle cx="90" cy="20" r="1.5" fill="#e9c349" />
            </svg>
            <div className="absolute left-8 bottom-8 text-[10px] uppercase tracking-widest opacity-40">From: {trip.depart_from || '—'}</div>
            <div className="absolute right-8 top-8 text-[10px] uppercase tracking-widest text-tertiary">To: {trip.arrive_at || '—'}</div>
          </div>
        </div>
        <div className="glass-panel rounded-[2rem] p-10 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-2xl text-primary">Packing</h3>
            <button onClick={() => setAddingPrep(s => !s)} className="text-[10px] text-tertiary opacity-60 hover:opacity-100 uppercase tracking-widest">{addingPrep ? 'Cancel' : '+ Add'}</button>
          </div>
          {addingPrep && (
            <form onSubmit={addPrep} className="space-y-2 mb-6">
              <input value={prepLabel} onChange={e => setPrepLabel(e.target.value)} placeholder="Item label" autoFocus className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
              <input type="number" min={0} max={100} value={prepProgress} onChange={e => setPrepProgress(Number(e.target.value))} placeholder="Progress %" className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
              <button type="submit" disabled={!prepLabel.trim()} className="w-full px-4 py-2 bg-tertiary text-on-tertiary rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-40">Add</button>
            </form>
          )}
          <div className="space-y-6 flex-1">
            {trip.prep.length === 0 && <p className="text-xs text-on-surface-variant opacity-40 italic">No packing items.</p>}
            {trip.prep.map(p => (
              <div key={p.id} className="space-y-2 group">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-on-surface opacity-80">{p.label}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateProgress(p.id, -10)} className="text-on-surface-variant opacity-40 hover:opacity-100 px-2">−</button>
                    <span className="text-tertiary text-xs w-10 text-right">{p.progress}%</span>
                    <button onClick={() => updateProgress(p.id, 10)} className="text-on-surface-variant opacity-40 hover:opacity-100 px-2">+</button>
                    <button onClick={() => removePrep(p.id)} className="opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-error transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary rounded-full transition-all duration-500" style={{ width: `${p.progress}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function TripSummaryCard({ trip, onActivate, onDelete, onEdit }: { trip: Trip; onActivate: () => void; onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="glass-card rounded-3xl p-6 hover:border-tertiary/30 transition-all duration-500 group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-display text-xl text-on-surface">{trip.title}</h3>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="text-on-surface-variant hover:text-tertiary transition-colors" aria-label="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="text-on-surface-variant hover:text-error transition-colors" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {trip.location && <p className="text-sm text-on-surface-variant opacity-60 mb-2">{trip.location}</p>}
      {(trip.start_date || trip.end_date) && (
        <p className="text-xs text-on-surface-variant opacity-50">{trip.start_date ?? '?'} → {trip.end_date ?? '?'}</p>
      )}
      <button onClick={onActivate} className="mt-6 w-full px-4 py-2 bg-white/5 hover:bg-tertiary/10 hover:text-tertiary border border-white/10 hover:border-tertiary/30 rounded-full text-xs font-bold uppercase tracking-widest transition-all">
        Set Active
      </button>
    </div>
  );
}

function TripForm({ onSubmit, initial, onCancel }: { onSubmit: () => void; initial?: Trip; onCancel?: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [start, setStart] = useState(initial?.start_date ?? '');
  const [end, setEnd] = useState(initial?.end_date ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  const [image, setImage] = useState(initial?.image_url ?? '');
  const [depart, setDepart] = useState(initial?.depart_from ?? '');
  const [arrive, setArrive] = useState(initial?.arrive_at ?? '');
  const [makeActive, setMakeActive] = useState(initial?.is_active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      location: location.trim(),
      start_date: start || null,
      end_date: end || null,
      description: desc.trim(),
      image_url: image.trim(),
      depart_from: depart.trim(),
      arrive_at: arrive.trim(),
      is_active: makeActive,
    };
    if (initial) {
      await api.patch(`/api/trips/${initial.id}`, payload);
    } else {
      await api.post('/api/trips', payload);
    }
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className={`glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in slide-in-from-top-2 ${initial ? 'border-tertiary/30' : ''}`}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Trip title" autoFocus className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30 md:col-span-2" />
      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30 md:col-span-2" />
      <input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      <input value={depart} onChange={e => setDepart(e.target.value)} placeholder="From" className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      <input value={arrive} onChange={e => setArrive(e.target.value)} placeholder="To" className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30" />
      <input value={image} onChange={e => setImage(e.target.value)} placeholder="Hero image URL (optional)" className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30 md:col-span-2" />
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" rows={2} className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-tertiary/30 md:col-span-2 resize-none" />
      <label className="text-xs text-on-surface-variant md:col-span-2 flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={makeActive} onChange={e => setMakeActive(e.target.checked)} />
        Mark as active trip
      </label>
      <div className="md:col-span-2 flex gap-2 justify-end">
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-on-surface-variant uppercase tracking-widest hover:text-on-surface">Cancel</button>}
        <button type="submit" disabled={!title.trim()} className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-40">{initial ? 'Save' : 'Save Trip'}</button>
      </div>
    </form>
  );
}

function TripEditForm({ trip, onCancel, onSaved }: { trip: Trip; onCancel: () => void; onSaved: () => void }) {
  return <TripForm initial={trip} onSubmit={onSaved} onCancel={onCancel} />;
}
