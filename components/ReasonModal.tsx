'use client';

import { useState } from 'react';
import type { ReasonCode } from '@/lib/types';
import { useLang } from './LanguageProvider';

export type ReasonMode = 'pause' | 'giveup' | 'skip' | 'missed';

export interface ReasonResult {
  reason_code: ReasonCode;
  reason_text: string;
  mood: number | null;
}

interface Props {
  mode: ReasonMode;
  onSubmit: (r: ReasonResult) => Promise<void>;
  onCancel: () => void;
}

/** Pause / Give Up / Skip / Missed — kaaran puchne wala modal (reason mandatory). */
export default function ReasonModal({ mode, onSubmit, onCancel }: Props) {
  const { t } = useLang();
  const [code, setCode] = useState<ReasonCode | null>(null);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const CODES = Object.keys(t.reasons) as ReasonCode[];

  async function handleSubmit() {
    setError('');
    if (!code) return setError(t.reason.need);
    setSaving(true);
    try {
      await onSubmit({ reason_code: code, reason_text: text.trim(), mood });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save fail ho gaya');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-indigo-950/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="slim-scroll max-h-[90vh] w-full max-w-md animate-rise overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-5 shadow-2xl backdrop-blur">
        <h2 className="text-base font-extrabold tracking-tight text-zinc-900">
          {t.reason.titles[mode]}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">{t.reason.subtitle}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {CODES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCode(c)}
              className={`rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold transition-all active:scale-[0.97] ${
                code === c
                  ? 'border-transparent bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-indigo-200 hover:bg-indigo-50/50'
              }`}
            >
              {t.reasons[c]}
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.reason.detailPh}
          maxLength={1000}
          rows={2}
          className="input mt-3"
        />

        <p className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          {t.reason.energy}
        </p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(mood === m ? null : m)}
              className={`flex-1 rounded-xl py-2 text-sm font-black tabular-nums transition-all active:scale-95 ${
                mood === m
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/30'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving ? t.form.saving : t.reason.submits[mode]}
          </button>
          <button onClick={onCancel} disabled={saving} className="btn-ghost">
            {t.common.back}
          </button>
        </div>
      </div>
    </div>
  );
}
