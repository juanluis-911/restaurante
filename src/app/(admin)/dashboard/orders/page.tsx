import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrdersKanban from '@/components/admin/OrdersKanban'

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

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
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <p className="text-muted-foreground text-sm mt-1">Vista en tiempo real de todos los pedidos activos</p>
      </div>
      <OrdersKanban initialOrders={orders ?? []} restaurantId={restaurant.id} />
    </div>
  )
}
