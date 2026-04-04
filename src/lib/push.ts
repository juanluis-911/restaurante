import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PushPayload {
  title: string
  body:  string
  url?:  string
  tag?:  string
}

type Subscription = {
  endpoint: string
  p256dh:   string
  auth:     string
}

async function sendToSubscriptions(subscriptions: Subscription[], payload: PushPayload) {
  const expiredEndpoints: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      } catch (err: unknown) {
        // 410 Gone = suscripción expirada, hay que borrarla
        if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint)
        } else {
          console.error('[push] sendNotification error:', err)
        }
      }
    })
  )

  if (expiredEndpoints.length > 0) {
    await serviceClient
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }
}

// ── Enviar al restaurante ───────────────────────────────────────────────────
export async function notifyRestaurant(restaurantId: string, payload: PushPayload) {
  const { data } = await serviceClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('restaurant_id', restaurantId)

  if (!data?.length) return
  await sendToSubscriptions(data, payload)
}

// ── Enviar al cliente que rastreba una orden ────────────────────────────────
export async function notifyOrderCustomer(orderId: string, payload: PushPayload) {
  const { data } = await serviceClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('order_id', orderId)

  if (!data?.length) return
  await sendToSubscriptions(data, payload)
}

// ── Enviar a TODOS los drivers disponibles ──────────────────────────────────
export async function notifyAllDrivers(payload: PushPayload) {
  // Obtener todos los driver_ids con suscripción activa
  const { data: subs } = await serviceClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, driver_id')
    .not('driver_id', 'is', null)

  if (!subs?.length) return

  // Filtrar solo los drivers que están disponibles (status = available o busy)
  const driverIds = [...new Set(subs.map((s) => s.driver_id).filter(Boolean))]
  const { data: activDrivers } = await serviceClient
    .from('drivers')
    .select('id')
    .in('id', driverIds)
    .in('status', ['available', 'busy'])
    .eq('is_active', true)

  if (!activDrivers?.length) return

  const activeIds = new Set(activDrivers.map((d) => d.id))
  const filtered = subs.filter((s) => s.driver_id && activeIds.has(s.driver_id))

  await sendToSubscriptions(filtered, payload)
}

// ── Enviar al driver asignado a una orden ───────────────────────────────────
export async function notifyAssignedDriver(driverId: string, payload: PushPayload) {
  const { data } = await serviceClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('driver_id', driverId)

  if (!data?.length) return
  await sendToSubscriptions(data, payload)
}
