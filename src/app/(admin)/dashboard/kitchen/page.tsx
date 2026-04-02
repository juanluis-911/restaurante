import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import KitchenBoard from '@/components/kitchen/KitchenBoard'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

export default async function KitchenPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  const { data: tickets } = await supabase
    .from('kitchen_tickets')
    .select('*, orders(customer_name, order_type, table_number, notes)')
    .eq('restaurant_id', restaurant.id)
    .in('status', ['queued', 'cooking'])
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cocina</h1>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <KitchenBoard initialTickets={(tickets ?? []) as any} restaurantId={restaurant.id} />
    </div>
  )
}
