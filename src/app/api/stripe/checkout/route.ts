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

export interface CheckoutPayload {
  restaurant_id:    string
  order_type:       'dine_in' | 'pickup' | 'delivery'
  customer_name:    string
  customer_phone:   string
  customer_email:   string
  notes:            string
  coupon_code:      string
  coupon_discount:  number   // monto en pesos ya calculado
  delivery_address: {
    street: string; neighborhood?: string; city: string; references?: string
  } | null
  items: {
    id: string; type: 'product' | 'combo'; name: string
    quantity: number; unit_price: number; original_price: number
  }[]
  subtotal:         number
  discount_amount:  number
  delivery_fee:     number
  total:            number
}

export async function POST(request: NextRequest) {
  const body: CheckoutPayload = await request.json()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  const supabase = adminClient()

  // Obtener el restaurante para verificar que tiene Stripe Connect
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, stripe_account_id, stripe_account_status, delivery_fee')
    .eq('id', body.restaurant_id)
    .single()

  if (!restaurant?.stripe_account_id || restaurant.stripe_account_status !== 'active') {
    return Response.json({ error: 'Restaurant does not have Stripe connected' }, { status: 400 })
  }

  // Construir line_items para Stripe
  // unit_price ya viene con descuento aplicado — no agregar línea negativa
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = body.items.map((item) => ({
    price_data: {
      currency:     'mxn',
      unit_amount:  Math.max(0, Math.round(item.unit_price * 100)),
      product_data: { name: item.name },
    },
    quantity: item.quantity,
  }))

  // Envío como línea si aplica
  if (body.order_type === 'delivery' && body.delivery_fee > 0) {
    lineItems.push({
      price_data: {
        currency:    'mxn',
        unit_amount: Math.max(0, Math.round(body.delivery_fee * 100)),
        product_data: { name: 'Costo de envío' },
      },
      quantity: 1,
    })
  }

  // Metadata que usaremos en el webhook para crear la orden
  const metadata: Record<string, string> = {
    restaurant_id:  body.restaurant_id,
    order_type:     body.order_type,
    customer_name:  body.customer_name,
    customer_phone: body.customer_phone,
    customer_email: body.customer_email,
    notes:          body.notes,
    coupon_code:    body.coupon_code,
    subtotal:       String(body.subtotal),
    discount_amount:String(body.discount_amount),
    delivery_fee:   String(body.delivery_fee),
    total:          String(body.total),
    items_json:     JSON.stringify(body.items.map((i) => ({
      ...(i.type === 'product' ? { product_id: i.id } : { combo_id: i.id }),
      name:            i.name,
      quantity:        i.quantity,
      unit_price:      i.unit_price,
      discount_amount: Math.round((i.original_price - i.unit_price) * i.quantity * 100) / 100,
    }))),
  }

  if (body.delivery_address) {
    metadata.delivery_address = JSON.stringify(body.delivery_address)
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode:               'payment',
      line_items:         lineItems,
      currency:           'mxn',
      customer_email:     body.customer_email || undefined,
      success_url:        `${baseUrl}/api/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}&slug=${restaurant.slug}`,
      cancel_url:         `${baseUrl}/${restaurant.slug}?checkout_cancelled=1`,
      metadata,
      payment_intent_data: {
        // Los fondos van directo a la cuenta del restaurante
        transfer_data: { destination: restaurant.stripe_account_id },
      },
    },
  )

  return Response.json({ url: session.url })
}
