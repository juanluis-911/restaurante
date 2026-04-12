import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyOrderStatusChanged } from '@/lib/actions/push-actions'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, restaurant_id, status, total, customer_email')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  // Solo el cliente dueño del pedido puede aceptar
  if (order.customer_email !== user.email) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (order.status !== 'quoted') {
    return NextResponse.json({ error: 'El pedido no está en estado "cotizado"' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  notifyOrderStatusChanged({
    orderId: id,
    restaurantId: order.restaurant_id,
    newStatus: 'accepted',
    orderTotal: order.total,
  }).catch(() => {/* silencioso */})

  return NextResponse.json({ ok: true })
}
