import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardStats from '@/components/admin/DashboardStats'
import ActiveOrdersList from '@/components/admin/ActiveOrdersList'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  // Estadísticas del día
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todayOrders } = await supabase
    .from('orders')
    .select('id, total, status, created_at')
    .eq('restaurant_id', restaurant.id)
    .gte('created_at', today.toISOString())
    .neq('status', 'cancelled')

  const totalRevenue = todayOrders?.reduce((sum, o) => sum + Number(o.total), 0) ?? 0
  const totalOrders = todayOrders?.length ?? 0
  const pendingOrders = todayOrders?.filter((o) =>
    ['received', 'accepted', 'preparing'].includes(o.status)
  ).length ?? 0
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Pedidos activos para la lista
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .in('status', ['received', 'accepted', 'preparing', 'ready', 'on_the_way'])
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Panel principal</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen de hoy, {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <DashboardStats
        totalRevenue={totalRevenue}
        totalOrders={totalOrders}
        pendingOrders={pendingOrders}
        avgTicket={avgTicket}
      />

      <div>
        <h2 className="text-lg font-medium mb-3">Pedidos activos</h2>
        <ActiveOrdersList
          initialOrders={activeOrders ?? []}
          restaurantId={restaurant.id}
        />
      </div>
    </div>
  )
}
