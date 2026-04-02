import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) return Response.json({ error: 'Restaurant not found' }, { status: 404 })

  // Con Account Links no hay deauthorize OAuth — simplemente limpiamos la referencia local.
  // La cuenta de Stripe del restaurante sigue existiendo de forma independiente.
  await supabase
    .from('restaurants')
    .update({
      stripe_account_id:     null,
      stripe_account_status: 'not_connected',
    })
    .eq('id', restaurant.id)

  return Response.json({ ok: true })
}
