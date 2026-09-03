import { createServerClient } from './supabaseServer';
import { buildWeekStats } from './stats';
import { generateInsight } from './openrouter';

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
 */
export async function analyzeWeek(from: string, to: string): Promise<AnalyzeResult> {
  const db = createServerClient();
  const { data: tasks, error: tErr } = await db
    .from('tasks')
    .select('*')
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
  const { insight, model } = await generateInsight(stats);

  const ai_summary =
    `${insight.summary}\n\nTime analysis: ${insight.time_analysis}\nCategory analysis: ${insight.category_analysis}`.trim();

  const { data: row, error: uErr } = await db
    .from('weekly_insights')
    .upsert(
      {
        week_start: from,
        week_end: to,
        stats_json: stats,
        ai_summary,
        patterns: insight.patterns,
        recommendations: insight.recommendations,
        model_used: model,
      },
      { onConflict: 'week_start,week_end' }
    )
    .select()
    .single();
  if (uErr) throw new Error(uErr.message);
  return { skipped: false, insight: row };
}
