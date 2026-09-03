'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from './LanguageProvider';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.8" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M3 12a9 9 0 1 0 2.6-6.4" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

/** Mobile bottom tab bar (desktop par hidden — wahan top nav tabs hain). */
export default function BottomTabBar() {
  const { t } = useLang();
  const path = usePathname();
  if (path === '/login') return null;

  const tabs = [
    { href: '/', label: t.nav.today, Icon: HomeIcon },
    { href: '/history', label: t.nav.history, Icon: HistoryIcon },
    { href: '/insights', label: t.nav.insights, Icon: SparkIcon },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 sm:hidden" aria-label="Primary">
      <div
        className="mx-auto mb-[max(env(safe-area-inset-bottom),0.75rem)] grid max-w-2xl grid-cols-3 gap-1 rounded-[1.75rem] border border-white/10 bg-indigo-950/95 p-2 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl"
      >
        {tabs.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition-all active:scale-95 ${
                active ? 'bg-white/15 text-white shadow-inner' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Icon />
              {label}
              <span
                className={`h-1 w-6 rounded-full transition-all ${
                  active ? 'bg-gradient-to-r from-amber-300 to-orange-400' : 'bg-transparent'
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
