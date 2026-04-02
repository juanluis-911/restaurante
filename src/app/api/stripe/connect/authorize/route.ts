import { createClient } from '@/lib/supabase/server'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) return Response.json({ error: 'Restaurant not found' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Si ya tiene cuenta conectada, generar link para actualizarla
  let accountId = restaurant.stripe_account_id

  if (!accountId) {
    // Crear nueva cuenta conectada de tipo Standard
    const account = await stripe.accounts.create({
      type:    'standard',
      country: 'MX',
      email:   user.email ?? undefined,
      metadata: { restaurant_id: restaurant.id },
    })
    accountId = account.id

    // Guardar el account_id con status 'pending' mientras completa el onboarding
    await supabase
      .from('restaurants')
      .update({
        stripe_account_id:     accountId,
        stripe_account_status: 'pending',
      })
      .eq('id', restaurant.id)
  }

  // Generar el link de onboarding
  const accountLink = await stripe.accountLinks.create({
    account:     accountId,
    refresh_url: `${baseUrl}/api/stripe/connect/authorize`,
    return_url:  `${baseUrl}/api/stripe/connect/callback?account_id=${accountId}&restaurant_id=${restaurant.id}`,
    type:        'account_onboarding',
  })

  return Response.redirect(accountLink.url)
}
