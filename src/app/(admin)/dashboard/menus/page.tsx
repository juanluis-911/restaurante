import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MenusList from '@/components/admin/MenusList'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

export default async function MenusPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  const { data: menus } = await supabase
    .from('menus')
    .select('id, name, description, is_active, position, categories(count)')
    .eq('restaurant_id', restaurant.id)
    .order('position')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Menús</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona tus menús, categorías y productos</p>
      </div>
      <MenusList
        initialMenus={menus ?? []}
        restaurantId={restaurant.id}
      />
    </div>
  )
}
