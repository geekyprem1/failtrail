'use client';

import { useEffect } from 'react';

/** Service worker register (client-side only — SSR me kuch nahi karta). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* SW fail ho to bhi app chalegi — alarm in-app bajega */
      });
    }
  }, []);
  return null;
}
