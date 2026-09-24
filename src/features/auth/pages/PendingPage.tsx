import { Clock } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { AuthLayout } from '../components/AuthLayout'

export const PendingPage = () => {
  const state = useLocation().state as { email?: string; justRegistered?: boolean } | null
  return (
    <AuthLayout
      title={state?.justRegistered ? 'Account created' : 'Waiting for approval'}
      subtitle="An admin needs to approve your account before you can chat."
      footer={
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="flex items-start gap-3 rounded-2xl bg-warning/10 p-4 text-sm text-fg">
        <Clock size={18} className="mt-0.5 shrink-0 text-warning" />
        <p>
          {state?.email ? (
            <>
              We&apos;ll let <strong>{state.email}</strong> in as soon as it&apos;s approved.
            </>
          ) : (
            'Your account is pending approval.'
          )}{' '}
          Try signing in again later.
        </p>
      </div>
    </AuthLayout>
  )
}
