import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { AppError } from '../../../lib/errors'
import { homePathFor, useAuthStore } from '../auth.store'
import { AuthLayout } from '../components/AuthLayout'

export const LoginPage = () => {
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(email.trim(), password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : homePathFor(user), { replace: true })
    } catch (caught) {
      const appError = caught as AppError
      if (appError.code === 'ACCOUNT_PENDING') {
        navigate('/pending', { replace: true, state: { email: email.trim() } })
        return
      }
      setError(appError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to chat with our support team."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && (
          <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting} disabled={!email || !password} className="mt-1">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
