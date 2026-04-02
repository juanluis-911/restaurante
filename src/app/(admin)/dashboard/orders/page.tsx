import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrdersKanban from '@/components/admin/OrdersKanban'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .not('status', 'in', '("delivered","cancelled")')
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Órdenes</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestión completa del flujo de pedidos en tiempo real</p>
      </div>
      <OrdersKanban initialOrders={orders ?? []} restaurantId={restaurant.id} />
    </div>
  )
}
