'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from './LanguageProvider';
import LangToggle from './LangToggle';

/** Premium top bar: logo + tabs + language toggle. */
export default function AppNav() {
  const { t } = useLang();
  const path = usePathname();
  const tabs = [
    { href: '/', label: t.nav.today },
    { href: '/history', label: t.nav.history },
    { href: '/insights', label: t.nav.insights },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-indigo-950/90 shadow-lg shadow-indigo-950/10 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-2xl items-center gap-1 px-4 py-2.5">
        <span className="mr-1 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-base font-black text-indigo-950 shadow">
          F
        </span>
        <span className="mr-2 hidden text-sm font-extrabold tracking-tight text-white sm:block">
          {t.app.name}
        </span>
        {tabs.map((tab) => {
          const active = path === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        <span className="ml-auto">
          <LangToggle />
        </span>
      </nav>
    </header>
  );
}
