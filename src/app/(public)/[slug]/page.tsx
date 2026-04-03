import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { isRestaurantOpen } from '@/lib/utils/helpers'
import StorefrontClient from '@/components/public/StorefrontClient'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!restaurant) notFound()

  const { data: hours } = await supabase
    .from('restaurant_hours')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('day_of_week')

  const isOpen = isRestaurantOpen(hours ?? [], restaurant.timezone)

  const { data: menus } = await supabase
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('position')

  const activeMenuIds = menus?.map((m) => m.id) ?? []

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('menu_id', activeMenuIds.length > 0 ? activeMenuIds : ['none'])
    .eq('is_active', true)
    .order('position')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('position')

  const { data: combos } = await supabase
    .from('combos')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('position')

  const { data: discounts } = await supabase
    .from('discounts')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)

  return (
    <StorefrontClient
      restaurant={restaurant}
      isOpen={isOpen}
      menus={menus ?? []}
      categories={categories ?? []}
      products={products ?? []}
      combos={combos ?? []}
      discounts={discounts ?? []}
      isLoggedIn={!!user}
    />
  )
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, address')
    .eq('slug', slug)
    .single()
  if (!restaurant) return { title: 'Restaurante no encontrado' }
  return {
    title: restaurant.name,
    description: restaurant.address ?? 'Haz tu pedido en línea',
  }
}
