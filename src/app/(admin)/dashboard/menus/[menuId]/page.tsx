import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MenuDetail from '@/components/admin/MenuDetail'

interface Props {
  params: Promise<{ menuId: string }>
}

export default async function MenuDetailPage({ params }: Props) {
  const { menuId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/auth/onboarding')

  const { data: menu } = await supabase
    .from('menus')
    .select('*')
    .eq('id', menuId)
    .eq('restaurant_id', restaurant.id)
    .single()

  if (!menu) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select('*, products(*)')
    .eq('menu_id', menuId)
    .order('position')

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <a href="/dashboard/menus" className="hover:underline">Menús</a> / {menu.name}
        </p>
        <h1 className="text-2xl font-semibold mt-1">{menu.name}</h1>
      </div>
      <MenuDetail
        menu={menu}
        initialCategories={categories ?? []}
        restaurantId={restaurant.id}
      />
    </div>
  )
}
