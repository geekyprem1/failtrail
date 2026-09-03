'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';

/** Logged-out user ko /login bhejta hai. Protected pages isme wrap karo. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="card flex items-center justify-center gap-2 p-8 text-sm font-medium text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
          …
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
