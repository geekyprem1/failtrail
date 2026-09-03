'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { STRINGS, type Lang, type Strings } from '@/lib/i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Strings;
}

const Ctx = createContext<LangCtx>({ lang: 'hinglish', setLang: () => {}, t: STRINGS.hinglish });

const KEY = 'ft-lang';

/** App-wide language (localStorage me persist). Default Hinglish. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('hinglish');

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s === 'en' || s === 'hinglish') setLangState(s);
    } catch {
      /* private mode — default rahega */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  };

  return <Ctx.Provider value={{ lang, setLang, t: STRINGS[lang] }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}
