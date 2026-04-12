import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { notifyNewOrder, notifyOrderStatusChanged } from '@/lib/actions/push-actions'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function adminClient() {
  return createSupabaseAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const sessionId = searchParams.get('session_id')
  const slug      = searchParams.get('slug')
  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL!

  if (!sessionId || !slug) {
    return Response.redirect(`${baseUrl}`)
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return Response.redirect(`${baseUrl}/${slug}?checkout_cancelled=1`)
    }

    const meta = session.metadata ?? {}
    const supabase = adminClient()

    // ── Flujo tienda: cotización pagada (order ya existe) ─────
    if (meta.existing_order_id) {
      const orderId = meta.existing_order_id

      // Idempotencia: si ya tiene stripe_session_id, ya fue procesado
      const { data: alreadyDone } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', orderId)
        .single()

      if (alreadyDone && alreadyDone.status !== 'quoted') {
        return Response.redirect(`${baseUrl}/${slug}/order/${orderId}?paid=1`)
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'accepted', stripe_session_id: sessionId, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (updateError) {
        console.error('Error updating store order after payment:', updateError)
        return Response.redirect(`${baseUrl}/${slug}?payment_error=1`)
      }

      notifyOrderStatusChanged({
        orderId,
        restaurantId: meta.restaurant_id,
        newStatus:    'accepted',
        orderTotal:   session.amount_total ? session.amount_total / 100 : 0,
        isPaid:       true, // pagado con tarjeta
      }).catch(() => {/* silencioso */})

      return Response.redirect(`${baseUrl}/${slug}/order/${orderId}?paid=1`)
    }

    // ── Flujo restaurante: crear orden nueva ──────────────────
    // Verificar que la orden no fue ya creada (idempotencia)
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()

    if (existing) {
      return Response.redirect(`${baseUrl}/${slug}/order/${existing.id}`)
    }

    const items = JSON.parse(meta.items_json ?? '[]')

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        restaurant_id:    meta.restaurant_id,
        source:           'online',
        order_type:       meta.order_type as 'dine_in' | 'pickup' | 'delivery',
        customer_name:    meta.customer_name,
        customer_phone:   meta.customer_phone || null,
        customer_email:   meta.customer_email || null,
        notes:            meta.notes || null,
        coupon_code:      meta.coupon_code || null,
        delivery_address: meta.delivery_address ? JSON.parse(meta.delivery_address) : null,
        items,
        subtotal:         Number(meta.subtotal),
        discount_amount:  Number(meta.discount_amount),
        delivery_fee:     Number(meta.delivery_fee),
        total:            Number(meta.total),
        status:           'received',
        stripe_session_id: sessionId,
      })
      .select('id')
      .single()

    if (error || !order) {
      console.error('Error creating order after payment:', error)
      return Response.redirect(`${baseUrl}/${slug}?payment_error=1`)
    }

    // Notificar al restaurante — pago confirmado con tarjeta
    notifyNewOrder({
      restaurantId: meta.restaurant_id,
      orderId:      order.id,
      total:        Number(meta.total),
      isPaid:       true,
      shortId:      order.id.slice(-5).toUpperCase(),
    }).catch(() => {/* silencioso */})

    return Response.redirect(`${baseUrl}/${slug}/order/${order.id}?paid=1`)
  } catch (err) {
    console.error('Stripe checkout success error:', err)
    return Response.redirect(`${baseUrl}/${slug}?payment_error=1`)
  }
}
