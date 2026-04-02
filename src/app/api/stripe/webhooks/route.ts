import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Cliente con service_role para bypasear RLS
function adminClient() {
  return createSupabaseAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const body      = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = adminClient()

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice

    // Buscar el billing_period por stripe_invoice_id
    const { data: period } = await supabase
      .from('billing_periods')
      .select('id, restaurant_id')
      .eq('stripe_invoice_id', invoice.id)
      .maybeSingle()

    if (period) {
      // Marcar periodo como pagado
      await supabase
        .from('billing_periods')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', period.id)

      // Reactivar restaurante
      await supabase
        .from('restaurants')
        .update({ billing_status: 'active' })
        .eq('id', period.restaurant_id)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice

    const { data: period } = await supabase
      .from('billing_periods')
      .select('id, restaurant_id')
      .eq('stripe_invoice_id', invoice.id)
      .maybeSingle()

    if (period) {
      await supabase
        .from('billing_periods')
        .update({ status: 'overdue' })
        .eq('id', period.id)
    }
  }

  return Response.json({ received: true })
}
