import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { notifyOrderStatusChanged } from '@/lib/actions/push-actions'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Usar service role: el cliente que acepta puede ser anónimo (sin sesión)
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, restaurant_id, status, total, order_type')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  if (order.status !== 'quoted') {
    return NextResponse.json({ error: 'El pedido no está en estado "cotizado"' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'accepted' })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  notifyOrderStatusChanged({
    orderId:      id,
    restaurantId: order.restaurant_id,
    newStatus:    'accepted',
    orderTotal:   order.total,
    orderType:    order.order_type,
    isPaid:       false, // efectivo al recibir
  }).catch(() => {/* silencioso */})

  return NextResponse.json({ ok: true })
}
