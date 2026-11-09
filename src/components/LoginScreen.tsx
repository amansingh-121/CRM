import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Mail, ShieldCheck, Store } from 'lucide-react';
import { DEMO_ACCOUNTS, CrmRole, useStore } from '../context/StoreContext.tsx';

const DEMO_ORDER: CrmRole[] = ['superadmin', 'admin', 'support', 'client'];

export const LoginScreen: React.FC = () => {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (target: string) => {
    if (!target.trim()) return setError('Enter your work email to continue.');
    setBusy(true);
    setError('');
    try {
      await login(target);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-4 sm:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-950 p-8 text-white lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold tracking-tight">Aureva CRM</p>
              <p className="text-[10px] uppercase tracking-[.18em] text-white/60">Agency command center</p>
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-tight">Every client, project and invoice in one isolated workspace.</h1>
            <p className="text-xs leading-relaxed text-white/70">
              Super Admin sees the full portfolio. Admins only see the client projects they are assigned to. Clients only see their own tenant.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/60">
            <ShieldCheck className="h-3.5 w-3.5" />
            Permission checks run on every API request, not just in the UI.
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="lg:hidden">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white"><Store className="h-4 w-4" /></div>
              <p className="text-sm font-bold">Aureva CRM</p>
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">Sign in</h2>
          <p className="mt-1 text-xs text-slate-500">Use a staff or client account. Customer storefront accounts cannot access the CRM.</p>

          <form
            className="mt-6 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(email);
            }}
          >
            <label className="crm-label">
              Work email
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@aureva.com"
                  className="crm-input pl-9"
                  autoComplete="email"
                />
              </div>
            </label>
            {error && (
              <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="crm-primary w-full justify-center py-2.5">
              {busy ? 'Signing in…' : 'Continue'}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            Demo accounts
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-2">
            {DEMO_ORDER.map((role) => {
              const account = DEMO_ACCOUNTS[role];
              return (
                <button
                  key={role}
                  type="button"
                  disabled={busy}
                  onClick={() => void submit(account.email)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-violet-200 hover:bg-violet-50/40 disabled:opacity-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{account.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{account.title}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-violet-600">Sign in</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
