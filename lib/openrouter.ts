import type { WeekStats } from './stats';

export interface AiInsight {
  summary: string;
  patterns: string[];
  time_analysis: string;
  category_analysis: string;
  recommendations: string[];
}

export type AiLang = 'en' | 'hinglish';

const SYSTEM_PROMPT_HINGLISH = `Tu ek strict par kind Hindi (Devanagari) productivity coach hai. Tujhe user ke kuch dino ka failure/success data JSON me milega (sirf aggregates — counts, rates, averages).

Rules:
- Sirf diye gaye data se jawab de, guess mat kar. Data me jo nahi hai wo mat bana.
- Reason codes English me aayenge (phone_social_media, neend_aalsi, mood_nahi, mushkil_laga, bhookh, guest_shor, urgent_kaam, light_net_issue, tabiyat, other) — unhe simple Hindi me samjha.
- Tone: direct, practical, blame-free. Chhote actionable steps de, gyaan mat de.
- Output SIRF valid JSON, koi extra text/markdown nahi:
{"summary": "3-4 lines, poore period ka nichod (numbers ke saath)",
 "patterns": ["roz repeat hone wala pattern 1", "pattern 2", "pattern 3 (jitne data me dikhe, max 3)"],
 "time_analysis": "kis time slot me sabse zyada fail, 1-2 lines",
 "category_analysis": "kis category me best/worst, 1-2 lines",
 "recommendations": ["agle week ka action 1", "action 2", "action 3"]}`;

const SYSTEM_PROMPT_EN = `You are a strict but kind English productivity coach. You will receive a few days of the user's failure/success data as JSON (aggregates only — counts, rates, averages).

Rules:
- Answer ONLY from the given data, never guess. Do not invent what is not in the data.
- Reason codes arrive in English (phone_social_media, neend_aalsi, mood_nahi, mushkil_laga, bhookh, guest_shor, urgent_kaam, light_net_issue, tabiyat, other) — explain them in plain English.
- Tone: direct, practical, blame-free. Small actionable steps, no preaching.
- Output ONLY valid JSON, no extra text/markdown:
{"summary": "3-4 lines, whole-period gist (with numbers)",
 "patterns": ["daily repeating pattern 1", "pattern 2", "pattern 3 (as many as data shows, max 3)"],
 "time_analysis": "which time slot fails most, 1-2 lines",
 "category_analysis": "best/worst category, 1-2 lines",
 "recommendations": ["next-week action 1", "action 2", "action 3"]}`;

/** OpenRouter chat call (server-only — key kabhi client me mat bhejo). 60s timeout. */
export async function generateInsight(
  stats: WeekStats,
  lang: AiLang = 'hinglish'
): Promise<{ insight: AiInsight; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing (.env.local me bharo)');
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
      'X-Title': 'FailTrail',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_HINGLISH },
        {
          role: 'user',
          content: `Week ${stats.range.from} to ${stats.range.to} ka data:\n${JSON.stringify(stats)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const j = await res.json();
  const content: string = j?.choices?.[0]?.message?.content ?? '';
  const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: Partial<AiInsight>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI se valid JSON nahi mila — retry karo');
  }
  return {
    insight: {
      summary: String(parsed.summary ?? '').slice(0, 2000),
      patterns: (Array.isArray(parsed.patterns) ? parsed.patterns : []).map(String).slice(0, 5),
      time_analysis: String(parsed.time_analysis ?? '').slice(0, 1000),
      category_analysis: String(parsed.category_analysis ?? '').slice(0, 1000),
      recommendations: (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
        .map(String)
        .slice(0, 5),
    },
    model,
  };
}
