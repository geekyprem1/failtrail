// FailTrail — shared DB types (mirror of supabase/schema.sql)

export type TaskStatus =
  | 'planned'
  | 'ringing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'missed';

export type SessionStatus = 'running' | 'paused' | 'completed' | 'failed';

export type Category = 'study' | 'work' | 'health' | 'other';

export type Priority = 'high' | 'medium' | 'low';

export type ReasonCode =
  | 'phone_social_media'
  | 'neend_aalsi'
  | 'mood_nahi'
  | 'mushkil_laga'
  | 'bhookh'
  | 'guest_shor'
  | 'urgent_kaam'
  | 'light_net_issue'
  | 'tabiyat'
  | 'other';

export const REASON_LABELS: Record<ReasonCode, string> = {
  phone_social_media: 'Phone / Social media',
  neend_aalsi: 'Neend / Aalsi',
  mood_nahi: 'Mood nahi tha',
  mushkil_laga: 'Mushkil laga',
  bhookh: 'Bhookh',
  guest_shor: 'Guest / Shor',
  urgent_kaam: 'Urgent kaam aa gaya',
  light_net_issue: 'Light / Net issue',
  tabiyat: 'Tabiyat',
  other: 'Other',
};

export interface Task {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  planned_date: string; // YYYY-MM-DD
  planned_start_time: string; // HH:MM:SS
  planned_duration_min: number;
  category: Category;
  priority: Priority;
  status: TaskStatus;
  snooze_count: number;
  created_at: string;
}

export interface TaskSession {
  id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  paused_total_sec: number;
  last_pause_at: string | null;
  total_focus_sec: number;
  status: SessionStatus;
}

export interface Interruption {
  id: string;
  task_id: string;
  session_id: string | null;
  reason_code: ReasonCode;
  reason_text: string;
  mood: number | null;
  occurred_at: string;
}

export interface Completion {
  id: string;
  task_id: string;
  session_id: string | null;
  difficulty: number;
  focus_percent: number;
  what_helped: string;
  what_distracted: string;
  notes: string;
  created_at: string;
}

export interface WeeklyInsight {
  id: string;
  week_start: string;
  week_end: string;
  stats_json: Record<string, unknown>;
  ai_summary: string;
  patterns: string[];
  recommendations: string[];
  model_used: string;
  created_at: string;
}
