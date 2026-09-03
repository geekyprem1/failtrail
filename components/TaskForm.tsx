'use client';

import { useMemo, useState } from 'react';
import type { Category, Priority, Task } from '@/lib/types';
import { findOverlaps, formatTime } from '@/lib/tasks';
import { useLang } from './LanguageProvider';

const DURATIONS = [15, 25, 50, 90];

interface Props {
  date: string;
  tasks: Task[];
  editing: Task | null;
  onDone: () => void;
  onCancelEdit: () => void;
}

export default function TaskForm({ date, tasks, editing, onDone, onCancelEdit }: Props) {
  const { t } = useLang();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [startTime, setStartTime] = useState(
    editing ? formatTime(editing.planned_start_time) : ''
  );
  const [duration, setDuration] = useState<number>(editing?.planned_duration_min ?? 25);
  const [customDuration, setCustomDuration] = useState('');
  const [category, setCategory] = useState<Category>(editing?.category ?? 'other');
  const [priority, setPriority] = useState<Priority>(editing?.priority ?? 'medium');
  const [notes, setNotes] = useState(editing?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const effectiveDuration = customDuration ? Number(customDuration) : duration;

  const overlaps = useMemo(() => {
    if (!startTime || !effectiveDuration) return [];
    return findOverlaps(
      {
        id: editing?.id,
        planned_date: editing?.planned_date ?? date,
        planned_start_time: startTime,
        planned_duration_min: effectiveDuration,
      },
      tasks
    );
  }, [startTime, effectiveDuration, tasks, editing, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError(t.form.errName);
    if (!startTime) return setError(t.form.errTime);
    if (!effectiveDuration || effectiveDuration < 5 || effectiveDuration > 480)
      return setError(t.form.errDur);

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: notes.trim(),
        planned_date: editing?.planned_date ?? date,
        planned_start_time: startTime,
        planned_duration_min: effectiveDuration,
        category,
        priority,
      };
      const res = await fetch(editing ? `/api/tasks/${editing.id}` : '/api/tasks', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Save fail ho gaya');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save fail ho gaya');
    } finally {
      setSaving(false);
    }
  }

  const labelCls = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-400';

  return (
    <form onSubmit={handleSubmit} className="card animate-rise">
      <h2 className="text-[15px] font-extrabold tracking-tight text-zinc-900">
        {editing ? t.form.editTitle : t.form.newTitle}
      </h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.form.titlePh}
        maxLength={200}
        className="input mt-3 py-2.5 text-[15px] font-medium"
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelCls}>{t.form.time}</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input tabular-nums"
          />
        </label>
        <div>
          <span className={labelCls}>{t.form.duration}</span>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDuration(d);
                  setCustomDuration('');
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-bold tabular-nums transition-all active:scale-95 ${
                  !customDuration && duration === d
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {d}
              </button>
            ))}
            <input
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder={t.form.custom}
              inputMode="numeric"
              className="w-[4.5rem] rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelCls}>{t.form.category}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="input">
            {(['study', 'work', 'health', 'other'] as Category[]).map((c) => (
              <option key={c} value={c}>{t.cats[c]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{t.form.priority}</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input">
            {(['high', 'medium', 'low'] as Priority[]).map((p) => (
              <option key={p} value={p}>{t.prios[p]}</option>
            ))}
          </select>
        </label>
      </div>

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t.form.notesPh}
        maxLength={1000}
        className="input mt-3"
      />

      {overlaps.length > 0 && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {t.form.overlap}: {overlaps.map((o) => `“${o.title}”`).join(', ')} {t.form.overlapTail}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 py-3">
          {saving ? t.form.saving : editing ? t.form.update : t.form.save}
        </button>
        {editing && (
          <button type="button" onClick={onCancelEdit} className="btn-ghost">
            {t.common.cancel}
          </button>
        )}
      </div>
    </form>
  );
}
