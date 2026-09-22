import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthUser } from '../types/auth'

interface Props { error: string | null; pendingUser: AuthUser | null; onLogin: (email: string, password: string) => Promise<void>; onRegister: (name: string, email: string, password: string) => Promise<void> }

export function AuthScreen({ error, pendingUser, onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLoading(true); try { await (mode === 'login' ? onLogin(email, password) : onRegister(name, email, password)) } finally { setLoading(false) } }
  if (pendingUser) return <main className="auth-shell"><section className="auth-card"><div className="brand-mark"><span /></div><div><h1>Account pending approval</h1><p>Thanks, {pendingUser.name}. An administrator must approve your account before you can sign in.</p></div></section></main>
  return <main className="auth-shell"><form className="auth-card" onSubmit={(event) => void submit(event)}><div className="brand-mark"><span /></div><div><h1>{mode === 'login' ? 'Welcome to orbit' : 'Create your account'}</h1><p>{mode === 'login' ? 'Sign in to access your workspace.' : 'New accounts require administrator approval.'}</p></div>{error && <p className="auth-error" role="alert">{error}</p>}{mode === 'register' && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>}<label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></label><button type="submit" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Request access'}</button><button className="auth-link" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Need an account? Request access' : 'Already approved? Sign in'}</button></form></main>
}
