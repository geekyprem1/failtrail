import type { SupabaseClient } from '@supabase/supabase-js';
import { buildWeekStats } from './stats';
import { generateInsight, type AiLang } from './openrouter';

export { weekMonday } from './tasks';

export interface AnalyzeResult {
  skipped: boolean;
  insight?: {
    id: string;
    week_start: string;
    week_end: string;
    ai_summary: string;
    patterns: string[];
    recommendations: string[];
    model_used: string;
    created_at: string;
  };
}

/**
 * Shared pipeline: week data → stats → OpenRouter → weekly_insights upsert.
 * Zero tasks → { skipped: true }, AI call nahi hota (cost bachta hai).
 * userId explicit hai taaki authed client (RLS) aur service client (cron) dono chale.
 */
export async function analyzeWeek(
  from: string,
  to: string,
  opts: { db: SupabaseClient; userId: string; lang?: AiLang }
): Promise<AnalyzeResult> {
  const { db, userId, lang = 'hinglish' } = opts;
  const { data: tasks, error: tErr } = await db
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('planned_date', from)
    .lte('planned_date', to);
  if (tErr) throw new Error(tErr.message);
  const list = tasks ?? [];
  if (list.length === 0) return { skipped: true };

  const ids = list.map((t: { id: string }) => t.id);
  const [{ data: sessions }, { data: interruptions }, { data: completions }] =
    await Promise.all([
      db.from('task_sessions').select('*').in('task_id', ids),
      db.from('interruptions').select('*').in('task_id', ids),
      db.from('completions').select('*').in('task_id', ids),
    ]);

  const stats = buildWeekStats(from, to, list, sessions ?? [], interruptions ?? [], completions ?? []);
  const { insight, model } = await generateInsight(stats, lang);

  const ai_summary =
    `${insight.summary}\n\nTime analysis: ${insight.time_analysis}\nCategory analysis: ${insight.category_analysis}`.trim();

  const base = {
    user_id: userId,
    week_start: from,
    week_end: to,
    stats_json: stats,
    ai_summary,
    patterns: insight.patterns,
    recommendations: insight.recommendations,
    model_used: model,
  };
  // lang column migration pending ho to bhi report bane (badge ke bina)
  try {
    const { data, error } = await db
      .from('weekly_insights')
      .upsert({ ...base, lang }, { onConflict: 'user_id,week_start,week_end' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { skipped: false, insight: data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (!/lang/i.test(msg)) throw e instanceof Error ? e : new Error(msg);
    const { data, error } = await db
      .from('weekly_insights')
      .upsert(base, { onConflict: 'user_id,week_start,week_end' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { skipped: false, insight: data };
  }
}
