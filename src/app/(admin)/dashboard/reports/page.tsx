import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsView from '@/components/admin/ReportsView'
import { subDays, startOfDay } from 'date-fns'
import Link from 'next/link'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

const RANGES = [
  { label: 'Hoy',       days: 0 },
  { label: '7 días',    days: 7 },
  { label: '30 días',   days: 30 },
  { label: '90 días',   days: 90 },
]

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days: daysParam } = await searchParams
  const days = parseInt(daysParam ?? '30')

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  const since = days === 0
    ? startOfDay(new Date()).toISOString()
    : subDays(new Date(), days).toISOString()

  const [{ data: orders }, { data: transactions }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status, created_at, order_type, source, discount_amount, items')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'delivered')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('pos_transactions')
      .select('payment_method, amount')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', since),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reportes de ventas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análisis de ingresos, productos más vendidos y métodos de pago
          </p>
        </div>

        {/* Selector de rango */}
        <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
          {RANGES.map(({ label, days: d }) => (
            <Link
              key={d}
              href={`/dashboard/reports?days=${d}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <ReportsView
        orders={(orders ?? []) as Parameters<typeof ReportsView>[0]['orders']}
        transactions={transactions ?? []}
      />
    </div>
  )
}
