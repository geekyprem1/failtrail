'use client';

import TaskCard from './TaskCard';
import { useLang } from './LanguageProvider';
import type { Task } from '@/lib/types';

interface Props {
  tasks: Task[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate: (t: Task) => void;
  onStart: (t: Task) => void;
}

export default function TaskList({ tasks, onEdit, onDelete, onDuplicate, onStart }: Props) {
  const { t } = useLang();
  if (tasks.length === 0) {
    return (
      <div className="card animate-rise border-dashed p-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-black text-white shadow-lg shadow-indigo-500/30">
          ✓
        </span>
        <p className="text-sm font-bold text-zinc-800">{t.emptyToday.title}</p>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-zinc-500">{t.emptyToday.sub}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onStart={onStart}
        />
      ))}
    </div>
  );
}
