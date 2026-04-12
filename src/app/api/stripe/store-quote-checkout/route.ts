import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function adminClient() {
  return createSupabaseAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Crea una sesión de Stripe para pagar una cotización ya aceptada (tiendas)
// El order ya existe en BD con total definido; solo necesitamos cobrar
export async function POST(request: NextRequest) {
  const body = await request.json() as { order_id: string; slug: string }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!body.order_id || !body.slug) {
    return Response.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const supabase = adminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, restaurant_id, status, total, delivery_fee, customer_name, customer_email, order_type')
    .eq('id', body.order_id)
    .single()

  if (!order) {
    return Response.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  if (order.status !== 'quoted') {
    return Response.json({ error: 'El pedido no está en estado cotizado' }, { status: 400 })
  }

  if (order.total <= 0) {
    return Response.json({ error: 'El total del pedido no es válido' }, { status: 400 })
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, slug, name, stripe_account_id, stripe_account_status')
    .eq('id', order.restaurant_id)
    .single()

  if (!restaurant?.stripe_account_id || restaurant.stripe_account_status !== 'active') {
    return Response.json({ error: 'La tienda no tiene Stripe Connect activo' }, { status: 400 })
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

  // Monto del pedido (subtotal = total - delivery_fee)
  const subtotal = order.total - (order.delivery_fee ?? 0)
  if (subtotal > 0) {
    lineItems.push({
      price_data: {
        currency:    'mxn',
        unit_amount: Math.round(subtotal * 100),
        product_data: { name: 'Tu pedido' },
      },
      quantity: 1,
    })
  }

  if ((order.delivery_fee ?? 0) > 0) {
    lineItems.push({
      price_data: {
        currency:    'mxn',
        unit_amount: Math.round((order.delivery_fee ?? 0) * 100),
        product_data: { name: 'Costo de envío' },
      },
      quantity: 1,
    })
  }

  const session = await stripe.checkout.sessions.create({
    mode:           'payment',
    line_items:     lineItems,
    currency:       'mxn',
    customer_email: order.customer_email || undefined,
    success_url:    `${baseUrl}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}&slug=${restaurant.slug}`,
    cancel_url:     `${baseUrl}/${restaurant.slug}/order/${order.id}`,
    metadata: {
      existing_order_id: order.id,
      restaurant_id:     order.restaurant_id,
    },
    payment_intent_data: {
      transfer_data: { destination: restaurant.stripe_account_id },
    },
  })

  return Response.json({ url: session.url })
}
