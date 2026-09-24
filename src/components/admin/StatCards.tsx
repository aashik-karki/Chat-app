import { CheckCircle2, Clock, Users, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardsProps {
  total: number
  pending: number
  approved: number
  rejected: number
}

const stats = (data: StatCardsProps) => [
  { label: 'Total users', value: data.total, icon: Users, tone: 'text-orbit bg-orbit-soft' },
  { label: 'Pending approval', value: data.pending, icon: Clock, tone: 'text-amber-600 bg-amber-50' },
  { label: 'Approved', value: data.approved, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
  { label: 'Rejected', value: data.rejected, icon: XCircle, tone: 'text-rose-600 bg-rose-50' },
] as const

/** Four at-a-glance account-status tiles across the top of the admin dashboard. */
export function StatCards(props: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats(props).map(({ label, value, icon: Icon, tone }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-3.5">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', tone)}>
              <Icon size={18} />
            </span>
            <span>
              <span className="block text-2xl font-bold leading-none text-foreground">{value}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
