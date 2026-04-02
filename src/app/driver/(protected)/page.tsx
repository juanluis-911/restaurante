import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DriverDashboard from '@/components/driver/DriverDashboard'
import type { Database } from '@/types/database'

type DriverRow = Database['public']['Tables']['drivers']['Row']
type OrderWithRestaurant = Database['public']['Tables']['orders']['Row'] & {
  restaurants: { name: string; primary_color: string; slug: string; driver_mode?: string } | null
}

export default async function DriverPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/driver/login')

  const { data: driver } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: DriverRow | null; error: unknown }

  if (!driver) redirect('/driver/login')

  // Pedidos disponibles: delivery + aceptados/preparando/listos + sin driver asignado
  const { data: rawOrders } = await sb
    .from('orders')
    .select('*, restaurants(name, primary_color, slug, driver_mode)')
    .eq('order_type', 'delivery')
    .in('status', ['accepted', 'preparing', 'ready'])
    .is('driver_id', null)
    .order('created_at', { ascending: true })

  const availableOrders = (rawOrders ?? []) as OrderWithRestaurant[]

  // Pedido que el driver ya tomó (cualquier status mientras no esté entregado/cancelado)
  const { data: rawActive } = await sb
    .from('orders')
    .select('*, restaurants(name, primary_color, slug)')
    .eq('driver_id', driver.id)
    .eq('order_type', 'delivery')
    .not('status', 'in', '("delivered","cancelled")')
    .maybeSingle()

  const activeOrder = (rawActive ?? null) as OrderWithRestaurant | null

  // Filtrar pedidos según driver_mode del restaurante
  const { data: myRestaurants } = await supabase
    .from('restaurant_drivers')
    .select('restaurant_id')
    .eq('driver_id', driver.id)

  const myRestaurantIds = new Set((myRestaurants ?? []).map((r) => r.restaurant_id))

  const filteredOrders = availableOrders.filter((o) => {
    const rest = o.restaurants
    if (!rest) return false
    if (!rest.driver_mode || rest.driver_mode === 'global') return true
    return myRestaurantIds.has(o.restaurant_id)
  })

  return (
    <DriverDashboard
      driver={driver as Parameters<typeof DriverDashboard>[0]['driver']}
      availableOrders={filteredOrders as Parameters<typeof DriverDashboard>[0]['availableOrders']}
      activeOrder={activeOrder as Parameters<typeof DriverDashboard>[0]['activeOrder']}
    />
  )
}
