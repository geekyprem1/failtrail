'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import RequireAuth from '@/components/RequireAuth';
import { todayISO, weekMonday } from '@/lib/tasks';
import { useLang } from '@/components/LanguageProvider';
import type { WeeklyInsight } from '@/lib/types';

function fmtRange(week_start: string, week_end: string, lang: string): string {
  const locale = lang === 'en' ? 'en-US' : 'hi-IN';
  const f = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };
  return `${f(week_start)} – ${f(week_end)}`;
}

export default function InsightsPage() {
  const { t, lang } = useLang();
  const [reports, setReports] = useState<WeeklyInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: qErr } = await supabase
        .from('weekly_insights')
        .select('*')
        .order('week_start', { ascending: false });
      if (qErr) throw new Error(qErr.message);
      setReports((data ?? []) as WeeklyInsight[]);
      if (data && data.length > 0) setOpenId((prev) => prev ?? data[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load fail ho gaya');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const today = todayISO();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: weekMonday(today), to: today }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'AI fail ho gaya');
      if (j.data.skipped) {
        setError(t.insights.emptyS);
      } else {
        await load();
        setOpenId(j.data.insight.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI fail ho gaya');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <RequireAuth>
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 pt-6">
      <header className="mb-5">
        <h1 className="bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 bg-clip-text text-[1.7rem] font-black leading-tight tracking-tight text-transparent">
          {t.insights.title}
        </h1>
        <p className="mt-0.5 text-xs font-medium text-zinc-500">{t.insights.sub}</p>
      </header>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="btn-primary w-full py-3.5 text-[15px]"
      >
        {generating ? t.insights.generating : t.insights.generate}
      </button>
      {generating && (
        <div className="mx-auto mt-3 h-1.5 w-2/3 overflow-hidden rounded-full bg-indigo-100">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
        </div>
      )}

      {error && (
        <p className="banner mt-3 border border-red-200 bg-red-50 font-medium text-red-700">{error}</p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {loading ? (
          <div className="card flex items-center justify-center gap-2 p-6 text-sm font-medium text-zinc-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
            {t.common.loading}
          </div>
        ) : reports.length === 0 ? (
          <div className="card border-dashed p-8 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-black text-white shadow-lg shadow-violet-500/30">
              AI
            </span>
            <p className="text-sm font-bold text-zinc-800">{t.insights.emptyT}</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-zinc-500">{t.insights.emptyS}</p>
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="card animate-rise">
              <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="w-full text-left">
                <p className="text-[15px] font-extrabold tracking-tight text-zinc-900">
                  {t.insights.week}: {fmtRange(r.week_start, r.week_end, lang)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                  {r.patterns.length} patterns · {r.model_used} ·{' '}
                  <span className="font-bold text-indigo-600">
                    {openId === r.id ? `▲ ${t.insights.close}` : `▼ ${t.insights.open}`}
                  </span>
                </p>
              </button>
              {openId === r.id && (
                <div className="mt-3 border-t border-zinc-100 pt-3">
                  <p className="whitespace-pre-line text-sm leading-6 text-zinc-800">{r.ai_summary}</p>
                  {r.patterns.length > 0 && (
                    <>
                      <p className="mb-1.5 mt-4 text-[11px] font-black tracking-wider text-red-600">
                        {t.insights.patterns}
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {r.patterns.map((p, i) => (
                          <li key={i} className="rounded-xl border border-red-100 bg-gradient-to-r from-red-50 to-orange-50 px-3 py-2 text-xs font-medium leading-5 text-red-900">
                            {i + 1}. {p}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {r.recommendations.length > 0 && (
                    <>
                      <p className="mb-1.5 mt-4 text-[11px] font-black tracking-wider text-emerald-600">
                        {t.insights.actions}
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {r.recommendations.map((rec, i) => (
                          <li key={i} className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-2 text-xs font-medium leading-5 text-emerald-900">
                            {i + 1}. {rec}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <p className="mt-5 text-center text-[11px] font-medium text-zinc-400">{t.insights.footer}</p>
    </main>
    </RequireAuth>
  );
}
