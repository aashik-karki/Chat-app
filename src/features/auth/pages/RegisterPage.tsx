import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { AppError } from '../../../lib/errors'
import { useAuthStore } from '../auth.store'
import { AuthLayout } from '../components/AuthLayout'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const RegisterPage = () => {
  const register = useAuthStore((state) => state.register)
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Same rules as the backend DTO, checked before sending.
  const errors = {
    name: form.name.trim() ? undefined : 'Enter your name',
    email: EMAIL.test(form.email.trim()) ? undefined : 'Enter a valid email',
    password: form.password.length >= 8 ? undefined : 'At least 8 characters',
  }
  const valid = !errors.name && !errors.email && !errors.password

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!valid) return
    setError(null)
    setSubmitting(true)
    try {
      await register(form.name.trim(), form.email.trim(), form.password)
      navigate('/pending', { replace: true, state: { email: form.email.trim(), justRegistered: true } })
    } catch (caught) {
      setError((caught as AppError).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="An admin approves new accounts, usually within a day."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <Field label="Full name" autoComplete="name" value={form.name} onChange={update('name')} error={touched ? errors.name : undefined} />
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={touched ? errors.email : undefined} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={touched ? errors.password : undefined}
          hint="At least 8 characters"
        />
        {error && (
          <p className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting} className="mt-1">
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
