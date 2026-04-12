import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MenusList from '@/components/admin/MenusList'
import CombosList from '@/components/admin/CombosList'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

export default async function MenusPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  const isStore = restaurant.business_type === 'store'

  const { data: menus } = await supabase
    .from('menus')
    .select('id, name, description, is_active, position, categories(count)')
    .eq('restaurant_id', restaurant.id)
    .order('position')

  const { data: combos } = isStore
    ? await supabase
        .from('combos')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('position')
    : { data: null }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{isStore ? 'Paquetes' : 'Menús'}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isStore
            ? 'Crea y organiza los paquetes que ofreces en tu tienda'
            : 'Gestiona tus menús, categorías y productos'}
        </p>
      </div>

      {isStore ? (
        <CombosList
          initialCombos={combos ?? []}
          restaurantId={restaurant.id}
        />
      ) : (
        <MenusList
          initialMenus={menus ?? []}
          restaurantId={restaurant.id}
          isStore={false}
        />
      )}
    </div>
  )
}
