import { MessagesSquare } from 'lucide-react'
import { EmptyState } from '../../../components/ui/EmptyState'

/** Built in step F2. */
export const CustomerChatPage = () => (
  <EmptyState icon={<MessagesSquare size={22} />} title="Support chat">
    Coming in the next step.
  </EmptyState>
)
