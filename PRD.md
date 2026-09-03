# PRD — FailTrail Web App (v1 MVP)

> Jo kaam main daily sochta hu wo kyun nahi kar pata — isko track karo, galti pakdo, better bano.

## 1. Vision
Ek aisa web app jo sirf todo-list na ho, balki **failure-tracking system** ho. Har planned kaam ka alarm baje, timer chale, beech me ruke to kaaran puche, complete ho to feedback le, aur week ke end me AI bataye — *"tum roz kya repeat kar rahe ho jo tumhe fail kara raha hai."*

## 2. Problem Statement
- User daily kaam sochta hai, list bhi banata hai, par complete nahi hota.
- Pata nahi chalta **kyun** fail ho raha hai — phone? neend? mood? difficult laga? time galat tha?
- Bina data ke sudhaar impossible hai.

## 3. Goals
1. Har task ka lifecycle track ho: `planned → ringing → running → paused → completed / failed / skipped`.
2. Har rukawat ka **reason capture** ho (predefined + custom + mood/energy).
3. Har completion ka **feedback capture** ho (difficulty, focus %, what helped/distracted).
4. Weekly AI report Hindi me: top 3 patterns + actionable sudhaar tips.
5. Simple, fast, mobile-friendly, installable (PWA).

## 4. Non-Goals (Phase 2 me)
- Login / multi-user (schema ready rakhenge,abhi nahi).
- Mobile native push (FCM), streak gamification, Pomodoro auto-breaks, PDF export, team sharing.

## 5. Target User
- Phase 1: Single user (owner). No login. Sabhi devices par same browser / same Supabase project.
- Phase 2: Supabase Auth (Email/Google) se multi-user.

## 6. Core Features (MVP)

### F1 — Daily Task Planner
- Task fields: `title*, planned_date*, planned_start_time*, planned_duration_min* (15/25/50/90/custom), category (study/work/health/other), priority (high/medium/low), notes (optional)`.
- Views:
  - **Aaj:** chronological list + status badge + countdown to next alarm.
  - **History/Calendar:** pichhle 7/30 din.
- Actions: Add, Edit (sirf planned state me), Delete, Duplicate (kal ke liye copy).
- Validation: title khali nahi, duration 5–480 min, overlapping tasks par warning (block nahi).

### F2 — Alarm (Sound + Browser Notification)
- `planned_start_time` par trigger:
  1. In-app full-screen ringing card: task name + `[Start Now] [5 min Snooze] [Skip]`.
  2. Alarm sound loop (Web Audio API, user-selectable tone) + `navigator.vibrate` (mobile).
  3. Browser Notification: "Time ho gaya: [task] — Start karo?" (permission pehle din mangenge).
- Snooze: `+5 min`, max 3 baar. Uske baad auto `missed`.
- Missed handling: agar tab band/PC sleep tha aur time nikal gaya → next open par `Missed — kya hua tha?` reason modal.
- Tech: PWA Service Worker + foreground `setInterval` checker (30 sec). Background perfect guarantee nahi (browser limit), isliye missed-catchup flow mandatory hai.

### F3 — Focus Timer
- Start → countdown `HH:MM:SS` + progress ring + elapsed.
- Controls: `Pause / Resume / Complete / Give Up`.
- **Reload-proof:** `started_at` Supabase `task_sessions` me save. Reload par `remaining = duration - (now - started_at - paused_total)` se recalc.
- Multiple pause allowed. Har pause ka reason mandatory (F4).
- Timer khatm hone par auto-sound + `Complete?` prompt.

### F4 — Rukne par KAARAN Puche (Heart of App)
- Trigger: `Pause` / `Give Up` / `Missed` / `Skip`.
- Modal fields (sab required sauf custom detail):
  - Reason chips (multi nahi, single select*): `phone_social_media, neend_aalsi, mood_nahi, mushkil_laga, bhookh, guest_shor, urgent_kaam, light_net_issue, tabiyat, other`
  - Custom text: "Sach-sach batao kya hua?" (optional par encourage).
  - Mood/Energy 1–5 slider.
- Save → `interruptions` table. Pause ke baad Resume possible. Give Up → task `failed`.
- *Single select taaki AI pattern nikal sake; detail text me aur likh sakte ho.

### F5 — Complete hone par Feedback
- Trigger: `Complete` button / timer natural end.
- Modal fields:
  - Difficulty 1–5, Focus % slider (0–100).
  - `Kisne help kiya?` (text, optional), `Kya distract kiya?` (text, optional), 1-line note.
- Save → `completions` table. Task `completed`.

### F6 — Dashboard & Failure Log
- Today strip: `Completion % | Focus time (min) | Fail count | Current streak`.
- Lists:
  - Failure Log: date + task + reason_code + reason_text + mood.
  - Success Log: date + task + focus % + difficulty.
- Filters: date range, category, status, reason_code.
- Empty states Hindi me encouraging copy ke saath.

### F7 — Weekly AI Insight (OpenRouter)
- **Auto:** Har Sunday 21:00 (Vercel Cron → `/api/cron/weekly`).
- **On-demand:** Button `[AI se meri galti nikalwao]` → `/api/analyze`.
- Input builder (server-side): us week ka stats JSON —
  `total_planned, completed, failed, completion_rate, total_focus_min, fails_by_reason, fails_by_hour_slot, fails_by_category, avg_mood_on_fail, repeat_tasks_failed`.
- Model: `env OPENROUTER_MODEL` default `openai/gpt-4o-mini`. Key sirf server me (`OPENROUTER_API_KEY`).
- Output (Hindi, JSON + markdown): `summary (3-4 lines) + top_patterns[3] + time_analysis + category_analysis + recommendations[3 actionable]`.
- Save → `weekly_insights` table. UI me card list + detail view. Regenerate allowed (max 3/day taaki cost bache).

## 7. UX Flows (Summary)
```
Plan → (wait) → RING → Start/Snooze/Skip
Start → RUNNING ⇄ Pause(reason)→Resume
Running → Complete(feedback) | GiveUp(reason) | Timeout→Complete?
Sunday 21:00 / Button → AI report
```

## 8. Functional Requirements
- FR1: Bina reason ke Pause/GiveUp save nahi hoga.
- FR2: Bina feedback ke Complete save nahi hoga (skip-note allowed par difficulty/focus required).
- FR3: Timer reload-proof hoga.
- FR4: Notification permission denied ho to bhi in-app alarm kaam karega.
- FR5: AI key missing ho to UI me clear error + retry, app crash nahi.

## 9. Non-Functional Requirements
- PWA installable, mobile responsive (360px+), Lighthouse perf >85.
- Page load <2s on 4G, timer tick jank-free (`requestAnimationFrame` ya 1s interval).
- Hindi (Roman + Devanagari mix) UI copy, English tech labels.
- Cost guard: OpenRouter call sirf weekly + max 3 manual/day.

## 10. Success Metrics (v1)
- Daily: ≥3 tasks planned me se ≥1 completed + reason logged.
- Weekly: ≥1 AI report generated.
- User khud bole: "mujhe mera pattern dikh raha hai."

## 11. Open Decisions (Locked)
| Decision | Choice |
|---|---|
| Stack | Next.js 14 + Supabase |
| Auth | Abhi nahi, schema ready |
| Alarm | Sound + Notification |
| AI | Auto weekly + on-demand both |
| Language | Hindi output |

---
*Approved by owner. Build order: Setup → DB → Planner → Alarm → Timer → Reason flows → Dashboard → AI → Cron → PWA → Deploy.*
