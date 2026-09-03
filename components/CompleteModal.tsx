'use client';

import { useState } from 'react';
import { useLang } from './LanguageProvider';

export interface CompletionResult {
  difficulty: number;
  focus_percent: number;
  what_helped: string;
  what_distracted: string;
  notes: string;
}

interface Props {
  taskTitle: string;
  onSubmit: (f: CompletionResult) => Promise<void>;
  onCancel: () => void;
}

/** Complete hone par feedback modal (difficulty + focus mandatory). */
export default function CompleteModal({ taskTitle, onSubmit, onCancel }: Props) {
  const { t } = useLang();
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [focus, setFocus] = useState(50);
  const [helped, setHelped] = useState('');
  const [distracted, setDistracted] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!difficulty) return setError(t.done.diffErr);
    setSaving(true);
    try {
      await onSubmit({
        difficulty,
        focus_percent: focus,
        what_helped: helped.trim(),
        what_distracted: distracted.trim(),
        notes: notes.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save fail ho gaya');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-indigo-950/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="slim-scroll max-h-[90vh] w-full max-w-md animate-rise overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-lg font-black text-white shadow-lg shadow-green-500/30">
          ✓
        </span>
        <h2 className="mt-2 text-base font-extrabold tracking-tight text-emerald-700">{t.done.title}</h2>
        <p className="mt-0.5 truncate text-xs text-zinc-500">{taskTitle}</p>

        <p className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          {t.done.difficulty}
        </p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`flex-1 rounded-xl py-2 text-sm font-black tabular-nums transition-all active:scale-95 ${
                difficulty === d
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-green-500/30'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{t.done.focus}</p>
          <p className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-lg font-black tabular-nums text-transparent">
            {focus}%
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={focus}
          onChange={(e) => setFocus(Number(e.target.value))}
          className="mt-1 w-full accent-emerald-600"
        />

        <div className="mt-3 flex flex-col gap-2">
          <input value={helped} onChange={(e) => setHelped(e.target.value)} placeholder={t.done.helpedPh} maxLength={1000} className="input" />
          <input value={distracted} onChange={(e) => setDistracted(e.target.value)} placeholder={t.done.distractedPh} maxLength={1000} className="input" />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.done.notePh} maxLength={1000} className="input" />
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button onClick={handleSubmit} disabled={saving} className="btn-green flex-1">
            {saving ? t.form.saving : t.done.submit}
          </button>
          <button onClick={onCancel} disabled={saving} className="btn-ghost">
            {t.common.back}
          </button>
        </div>
      </div>
    </div>
  );
}
