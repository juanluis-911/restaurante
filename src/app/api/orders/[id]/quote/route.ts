import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyOrderStatusChanged } from '@/lib/actions/push-actions'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const subtotal     = Number(body.subtotal)
  const delivery_fee = Number(body.delivery_fee ?? 0)
  const quote_message = typeof body.quote_message === 'string' && body.quote_message.trim()
    ? body.quote_message.trim()
    : null

  if (isNaN(subtotal) || subtotal <= 0) {
    return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
  }

  const total = subtotal + delivery_fee

  // Verificar que el pedido pertenece a un restaurante del usuario
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, restaurant_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', order.restaurant_id)
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (!['received', 'quote_rejected', 'quoted'].includes(order.status)) {
    return NextResponse.json({ error: 'Estado inválido para cotizar' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ subtotal, delivery_fee, total, status: 'quoted', quote_message })
    .eq('id', id)

  if (updateError) {
    console.error('[quote] update error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  notifyOrderStatusChanged({
    orderId: id,
    restaurantId: order.restaurant_id,
    newStatus: 'quoted',
    orderTotal: total,
    deliveryFee: delivery_fee,
  }).catch(() => {/* silencioso */})

  return NextResponse.json({ ok: true })
}
