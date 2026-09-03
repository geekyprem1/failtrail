'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLang } from './LanguageProvider';
import { useSession } from '@/lib/useSession';
import { supabase } from '@/lib/supabaseClient';
import LangToggle from './LangToggle';

/** Top bar: logo + auth + language. Tabs desktop par, mobile par bottom bar. */
export default function AppNav() {
  const { t } = useLang();
  const path = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  const tabs = [
    { href: '/', label: t.nav.today },
    { href: '/history', label: t.nav.history },
    { href: '/insights', label: t.nav.insights },
  ];

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-indigo-950/90 shadow-lg shadow-indigo-950/10 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-2xl items-center gap-1.5 px-4 py-3">
        <span className="font-display mr-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-lg font-extrabold text-indigo-950 shadow-lg shadow-orange-500/20">
          F
        </span>
        <span className="font-display mr-1 text-[15px] font-extrabold tracking-tight text-white">
          {t.app.name}
        </span>
        <div className="hidden items-center gap-1 sm:flex">
          {tabs.map((tab) => {
            const active = path === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                  active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <span className="ml-auto flex items-center gap-2">
          {!loading &&
            (user ? (
              <>
                <span className="hidden max-w-28 truncate text-[11px] font-semibold text-white/60 md:block">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="min-h-[36px] rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-bold text-white/80 transition-all hover:bg-white/25 hover:text-white active:scale-95"
                >
                  {t.auth.logout}
                </button>
              </>
            ) : (
              path !== '/login' && (
                <Link
                  href="/login"
                  className="min-h-[36px] rounded-full bg-white px-4 py-1.5 text-[11px] font-bold text-indigo-700 shadow transition-all hover:brightness-95 active:scale-95"
                >
                  {t.auth.login}
                </Link>
              )
            ))}
          <LangToggle />
        </span>
      </nav>
    </header>
  );
}
