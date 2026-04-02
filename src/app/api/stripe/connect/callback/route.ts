import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const accountId    = searchParams.get('account_id')
  const restaurantId = searchParams.get('restaurant_id')
  const baseUrl      = process.env.NEXT_PUBLIC_APP_URL!

  if (!accountId || !restaurantId) {
    return Response.redirect(`${baseUrl}/dashboard/settings?stripe_error=1`)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.redirect(`${baseUrl}/auth/login`)

    // Verificar que el restaurante le pertenece al usuario
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, owner_id')
      .eq('id', restaurantId)
      .eq('owner_id', user.id)
      .single()

    if (!restaurant) {
      return Response.redirect(`${baseUrl}/dashboard/settings?stripe_error=1`)
    }

    // Verificar el estado de la cuenta en Stripe
    const account = await stripe.accounts.retrieve(accountId)
    const status  = account.details_submitted ? 'active' : 'pending'

    await supabase
      .from('restaurants')
      .update({
        stripe_account_id:     accountId,
        stripe_account_status: status,
      })
      .eq('id', restaurantId)

    if (status === 'active') {
      return Response.redirect(`${baseUrl}/dashboard/settings?stripe_connected=1`)
    } else {
      // Onboarding incompleto, redirigir de vuelta con mensaje
      return Response.redirect(`${baseUrl}/dashboard/settings?stripe_pending=1`)
    }
  } catch {
    return Response.redirect(`${baseUrl}/dashboard/settings?stripe_error=1`)
  }
}
