import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import POSTerminal from '@/components/pos/POSTerminal'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

export default async function POSPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  // Categorías activas con sus productos activos, ordenadas por posición
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, position, products(*)')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('position')

  // Filtrar productos inactivos dentro de cada categoría
  const categoriesWithProducts = (categories ?? [])
    .map((cat) => ({
      ...cat,
      products: (cat.products as { is_active: boolean }[]).filter((p) => p.is_active),
    }))
    .filter((cat) => cat.products.length > 0)

  // Combos activos
  const { data: combos } = await supabase
    .from('combos')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('position')

  // Sesión de caja abierta (si existe)
  const { data: openSession } = await supabase
    .from('pos_sessions')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('user_id', user.id)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <POSTerminal
      restaurant={restaurant}
      categories={categoriesWithProducts}
      combos={combos ?? []}
      openSession={openSession ?? null}
      userId={user.id}
    />
  )
}
