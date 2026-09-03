'use client';

import { useLang } from './LanguageProvider';

/** EN / Hinglish pill toggle. */
export default function LangToggle() {
  const { lang, setLang } = useLang();
  const btn = (active: boolean) =>
    `rounded-full px-3 py-1.5 min-h-[36px] text-[11px] font-bold transition-all ${
      active ? 'bg-white text-indigo-700 shadow' : 'text-white/70 hover:text-white'
    }`;
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-white/15 p-0.5 backdrop-blur">
      <button onClick={() => setLang('hinglish')} className={btn(lang === 'hinglish')}>
        Hinglish
      </button>
      <button onClick={() => setLang('en')} className={btn(lang === 'en')}>
        EN
      </button>
    </div>
  );
}
