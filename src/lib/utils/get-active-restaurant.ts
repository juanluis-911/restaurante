import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type TypedClient = SupabaseClient<Database>
export type RestaurantRow = Database['public']['Tables']['restaurants']['Row']

export async function getActiveRestaurant(userId: string, supabase: TypedClient) {
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at')

  if (!restaurants?.length) return { restaurant: null, restaurants: [] as RestaurantRow[] }

  const cookieStore = await cookies()
  const savedId = cookieStore.get('active_restaurant')?.value
  const restaurant = restaurants.find((r) => r.id === savedId) ?? restaurants[0]

  return { restaurant, restaurants }
}
