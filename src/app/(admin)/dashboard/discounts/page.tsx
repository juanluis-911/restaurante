import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiscountsList from '@/components/admin/DiscountsList'
import type { Database } from '@/types/database'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

type Coupon = Database['public']['Tables']['coupons']['Row'] & {
  discounts: { name: string } | null
}

export default async function DiscountsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  const [{ data: discounts }, { data: coupons }] = await Promise.all([
    supabase
      .from('discounts')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('coupons')
      .select('*, discounts(name)')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Descuentos y cupones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crea descuentos automáticos y códigos de cupón para tus clientes
        </p>
      </div>
      <DiscountsList
        initialDiscounts={discounts ?? []}
        initialCoupons={(coupons ?? []) as Coupon[]}
        restaurantId={restaurant.id}
      />
    </div>
  )
}
