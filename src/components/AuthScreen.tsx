import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthUser } from '../types/auth'

interface Props {
  error: string | null
  pendingUser: AuthUser | null
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (name: string, email: string, password: string) => Promise<void>
}

const inputClass =
  'rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-orbit focus:ring-4 focus:ring-orbit-soft'
const primaryButtonClass =
  'rounded-lg bg-orbit px-3 py-3 text-xs font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300'

export function AuthScreen({ error, pendingUser, onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    try {
      await (mode === 'login' ? onLogin(email, password) : onRegister(name, email, password))
    } finally {
      setLoading(false)
    }
  }

  const brandMark = (
    <div
      aria-hidden="true"
      className="relative h-6 w-6 -rotate-[7deg] rounded-tl-[9px] rounded-tr-[9px] rounded-br-[9px] rounded-bl-[2px] bg-orbit shadow-[inset_-5px_-4px_0_#a99cf1]"
    >
      <span className="absolute left-[10px] top-2 h-[5px] w-[5px] rounded-full bg-white" />
    </div>
  )

  if (pendingUser) {
    return (
      <main className="grid min-h-svh place-items-center bg-slate-50 p-6">
        <section className="flex w-full max-w-[390px] flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_45px_rgba(48,35,79,.09)]">
          {brandMark}
          <div>
            <h1 className="m-0 text-[22px] font-bold leading-7 text-slate-800">Account pending approval</h1>
            <p className="mt-1 text-xs leading-[18px] text-slate-500">
              Thanks, {pendingUser.name}. An administrator must approve your account before you can sign in.
            </p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="grid min-h-svh place-items-center bg-slate-50 p-6">
      <form
        className="flex w-full max-w-[390px] flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_18px_45px_rgba(48,35,79,.09)]"
        onSubmit={(event) => void submit(event)}
      >
        {brandMark}
        <div>
          <h1 className="m-0 text-[22px] font-bold leading-7 text-slate-800">
            {mode === 'login' ? 'Welcome to orbit' : 'Create your account'}
          </h1>
          <p className="mt-1 text-xs leading-[18px] text-slate-500">
            {mode === 'login' ? 'Sign in to access your workspace.' : 'New accounts require administrator approval.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
            {error}
          </p>
        )}

        {mode === 'register' && (
          <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600">
            Name
            <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600">
          Email
          <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        <label className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600">
          Password
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
          />
        </label>

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Request access'}
        </button>
        <button
          type="button"
          className="rounded-lg bg-transparent p-0 text-xs font-semibold text-orbit hover:underline"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'Need an account? Request access' : 'Already approved? Sign in'}
        </button>
      </form>
    </main>
  )
}
