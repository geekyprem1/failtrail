'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/lib/useSession';
import { useLang } from '@/components/LanguageProvider';

/** Query param (?error=link) padhta hai — static prerender nahi ho sakta. */
export const dynamic = 'force-dynamic';

/** Email OTP login — password yaad rakhne ka jhanjhat nahi. */
function LoginForm() {
  const { t } = useLang();
  const router = useRouter();
  const search = useSearchParams();
  const linkError = search.get('error') === 'link';
  const { user, loading: sessLoading } = useSession();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessLoading && user) router.replace('/');
  }, [sessLoading, user, router]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const clean = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return setError(t.auth.errEmail);
    setBusy(true);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: clean,
        options: {
          shouldCreateUser: true,
          // email ka link isi app par wapas aaye (code na mile to link se login)
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (otpErr) throw otpErr;
      setEmail(clean);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP fail ho gaya');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (code.trim().length < 6) return setError(t.auth.errCode);
    setBusy(true);
    try {
      const { data, error: vErr } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      });
      if (vErr) throw vErr;
      if (!data.session) throw new Error(t.auth.errCode);
      // v1 ka purana data isi account se jodo (first login par rows milengi, baad me zero)
      try {
        await fetch('/api/auth/claim', { method: 'POST' });
      } catch {
        /* claim fail ho to bhi login success — History me retry hoga */
      }
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verify fail ho gaya');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-10 sm:pb-10">
      <div className="card animate-rise mx-auto max-w-md p-6 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-black text-white shadow-lg shadow-indigo-600/30">
          F
        </span>
        <h1 className="font-display bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-700 bg-clip-text text-2xl font-black tracking-tight text-transparent">
          FailTrail
        </h1>
        <p className="mt-1 text-xs font-medium text-zinc-500">{t.auth.sub}</p>

        {step === 'email' ? (
          <form onSubmit={sendCode} className="mt-5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPh}
              autoComplete="email"
              className="input !py-3 text-center"
            />
            <button type="submit" disabled={busy} className="btn-primary mt-3 w-full !py-3">
              {busy ? t.auth.sending : t.auth.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-5">
            <p className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800">
              {t.auth.codeSent(email)}
            </p>
            <p className="mb-3 text-[11px] leading-4 text-zinc-500">{t.auth.linkHint}</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder={t.auth.codePh}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input !py-3 text-center text-lg font-black tracking-[0.3em] tabular-nums"
            />
            <button type="submit" disabled={busy} className="btn-primary mt-3 w-full !py-3">
              {busy ? t.auth.verifying : t.auth.verify}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
              className="mt-2 w-full rounded-xl px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-50"
            >
              {t.auth.back}
            </button>
          </form>
        )}

        {(error || linkError) && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error || t.auth.errLink}
          </p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <div className="card p-8 text-center text-sm font-medium text-zinc-400">…</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
