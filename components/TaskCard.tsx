'use client';

import type { Task } from '@/lib/types';
import { formatTime, taskEndLabel } from '@/lib/tasks';
import { useLang } from './LanguageProvider';

const STATUS_CLS: Record<Task['status'], string> = {
  planned: 'bg-slate-100 text-slate-600',
  ringing: 'bg-red-100 text-red-700 animate-glow',
  running: 'bg-blue-100 text-blue-700',
  paused: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-50 text-red-600',
  skipped: 'bg-slate-100 text-slate-400',
  missed: 'bg-orange-100 text-orange-700',
};

const PRIORITY_DOT: Record<Task['priority'], string> = {
  high: 'bg-gradient-to-r from-red-500 to-orange-500',
  medium: 'bg-gradient-to-r from-amber-400 to-yellow-500',
  low: 'bg-gradient-to-r from-emerald-400 to-green-500',
};

const EDITABLE: Task['status'][] = ['planned', 'missed', 'skipped'];
const STARTABLE: Task['status'][] = ['planned', 'ringing', 'missed', 'skipped', 'failed'];

interface Props {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate: (t: Task) => void;
  onStart: (t: Task) => void;
}

export default function TaskCard({ task, onEdit, onDelete, onDuplicate, onStart }: Props) {
  const { t } = useLang();
  const editable = EDITABLE.includes(task.status);
  const startable = STARTABLE.includes(task.status);

  return (
    <div className="card animate-rise transition-shadow hover:shadow-2xl hover:shadow-indigo-950/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-tight text-zinc-900">{task.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium tabular-nums text-zinc-500">
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-700">
              {formatTime(task.planned_start_time)} – {taskEndLabel(task)}
            </span>
            <span>· {task.planned_duration_min} {t.common.min}</span>
            <span>· {t.cats[task.category]}</span>
          </p>
          {task.description && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-zinc-600">{task.description}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLS[task.status]}`}
        >
          {t.status[task.status]}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
        <span className={`h-2.5 w-2.5 rounded-full shadow ${PRIORITY_DOT[task.priority]}`} title={task.priority} />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {t.prios[task.priority]}
        </span>
        <div className="ml-auto flex gap-1.5">
          {startable && (
            <button
              onClick={() => onStart(task)}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition-all hover:brightness-110 active:scale-95"
            >
              {t.card.start}
            </button>
          )}
          {editable && (
            <button onClick={() => onEdit(task)} className="btn-chip">
              {t.card.edit}
            </button>
          )}
          <button onClick={() => onDuplicate(task)} className="btn-chip">
            {t.card.copy}
          </button>
          <button
            onClick={() => {
              if (window.confirm(t.card.delConfirm(task.title))) onDelete(task.id);
            }}
            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-500 transition-all hover:bg-red-50 active:scale-95"
          >
            {t.card.del}
          </button>
        </div>
      </div>
    </div>
  );
}
