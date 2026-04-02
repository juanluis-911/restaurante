import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) return Response.json({ error: 'Restaurant not found' }, { status: 404 })

  // Buscar la factura pendiente más reciente
  const { data: period } = await supabase
    .from('billing_periods')
    .select('stripe_payment_url, status, amount_owed, week_start')
    .eq('restaurant_id', restaurant.id)
    .in('status', ['invoiced', 'overdue'])
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!period?.stripe_payment_url) {
    return Response.json({ error: 'No pending invoice found' }, { status: 404 })
  }

  return Response.json({
    payment_url: period.stripe_payment_url,
    amount_owed: period.amount_owed,
    week_start:  period.week_start,
    status:      period.status,
  })
}
