import { Link } from 'react-router'
import { EmptyState } from '../components/ui/EmptyState'

export const NotFoundPage = () => (
  <main className="flex min-h-svh bg-bg">
    <EmptyState title="Page not found">
      <Link to="/" className="font-semibold text-primary hover:underline">
        Go to the home page
      </Link>
    </EmptyState>
  </main>
)
