'use server'

import {
  notifyRestaurant,
  notifyOrderCustomer,
  notifyAllDrivers,
  notifyAssignedDriver,
} from '@/lib/push'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

// ── Notificar al restaurante cuando llega un nuevo pedido ──────────────────
export async function notifyNewOrder(params: {
  restaurantId: string
  orderId:       string
  total:         number
  isPaid:        boolean   // true = pagado con tarjeta, false = efectivo
  shortId:       string    // últimos 5 chars del UUID
}) {
  const { restaurantId, orderId, total, isPaid, shortId } = params
  const paymentLabel = isPaid ? 'pagado con tarjeta 💳' : 'efectivo al recibir 💵'

  await notifyRestaurant(restaurantId, {
    title: '🛎️ Nuevo pedido',
    body:  `${fmt(total)} ${paymentLabel} — #${shortId}`,
    url:   '/dashboard/orders',
    tag:   `new-order-${orderId}`,
  })
}

// ── Notificar a los interesados cuando cambia el estado de la orden ────────
export async function notifyOrderStatusChanged(params: {
  orderId:       string
  newStatus:     string
  orderType:     string
  driverId:      string | null
  restaurantSlug: string
  shortId:       string
}) {
  const { orderId, newStatus, orderType, driverId, restaurantSlug, shortId } = params
  const isDelivery = orderType === 'delivery'
  const trackUrl   = `/${restaurantSlug}/order/${orderId}`

  switch (newStatus) {

    case 'accepted':
      await notifyOrderCustomer(orderId, {
        title: '✅ Pedido aceptado',
        body:  `El restaurante confirmó tu pedido #${shortId}`,
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      if (isDelivery) {
        await notifyAllDrivers({
          title: '🛵 Nueva entrega disponible',
          body:  `Pedido #${shortId} listo para ser tomado`,
          url:   '/driver',
          tag:   `driver-available-${orderId}`,
        })
      }
      break

    case 'preparing':
      await notifyOrderCustomer(orderId, {
        title: '👨‍🍳 Preparando tu pedido',
        body:  `Están cocinando tu pedido #${shortId}`,
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      break

    case 'ready':
      await notifyOrderCustomer(orderId, {
        title: '🎉 ¡Tu pedido está listo!',
        body:  isDelivery ? 'El repartidor lo recogerá pronto' : 'Puedes pasar a recogerlo',
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      if (isDelivery && driverId) {
        await notifyAssignedDriver(driverId, {
          title: '🎉 Pedido listo para recoger',
          body:  `Pedido #${shortId} — dirígete al restaurante`,
          url:   '/driver',
          tag:   `driver-ready-${orderId}`,
        })
      }
      break

    case 'on_the_way':
      await notifyOrderCustomer(orderId, {
        title: '🛵 Tu pedido va en camino',
        body:  `El repartidor está en camino con tu pedido #${shortId}`,
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      break

    case 'delivered':
      await notifyOrderCustomer(orderId, {
        title: '🏠 ¡Pedido entregado!',
        body:  '¡Buen provecho! Gracias por tu pedido',
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      break

    case 'cancelled':
      await notifyOrderCustomer(orderId, {
        title: '❌ Pedido cancelado',
        body:  `Tu pedido #${shortId} fue cancelado`,
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      if (isDelivery && driverId) {
        await notifyAssignedDriver(driverId, {
          title: '❌ Pedido cancelado',
          body:  `El pedido #${shortId} fue cancelado por el restaurante`,
          url:   '/driver',
          tag:   `driver-cancelled-${orderId}`,
        })
      }
      break
  }
}
