import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

type PushContext =
  | { type: 'restaurant'; id: string }
  | { type: 'driver';     id: string }
  | { type: 'order';      id: string }

export async function POST(request: Request) {
  const body = await request.json()
  const { subscription, context } = body as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
    context: PushContext
  }

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return Response.json({ error: 'Subscription inválida' }, { status: 400 })
  }
  if (!context?.type || !context?.id) {
    return Response.json({ error: 'Context inválido' }, { status: 400 })
  }

  // Usar service role para bypassear RLS al hacer upsert
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Intentar obtener el user_id si hay sesión
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // No hay sesión, es un cliente anónimo — OK
  }

  const record: Record<string, unknown> = {
    endpoint:  subscription.endpoint,
    p256dh:    subscription.keys.p256dh,
    auth:      subscription.keys.auth,
    user_id:   userId,
    restaurant_id: null,
    driver_id:     null,
    order_id:      null,
  }

  if (context.type === 'restaurant') record.restaurant_id = context.id
  if (context.type === 'driver')     record.driver_id     = context.id
  if (context.type === 'order')      record.order_id      = context.id

  const { error } = await serviceClient
    .from('push_subscriptions')
    .upsert(record, { onConflict: 'endpoint' })

  if (error) {
    console.error('[push/subscribe] upsert error:', error)
    return Response.json({ error: 'Error al guardar suscripción' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
