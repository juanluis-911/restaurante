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

  // Orden de tienda sin precio fijo aún (total=0 = pendiente de cotización)
  const body = total === 0
    ? `Por cotizar — #${shortId}`
    : `${fmt(total)} ${isPaid ? 'pagado con tarjeta 💳' : 'efectivo al recibir 💵'} — #${shortId}`

  await notifyRestaurant(restaurantId, {
    title: '🛎️ Nuevo pedido',
    body,
    url:   '/dashboard/orders',
    tag:   `new-order-${orderId}`,
  })
}

// ── Notificar a los interesados cuando cambia el estado de la orden ────────
export async function notifyOrderStatusChanged(params: {
  orderId:          string
  newStatus:        string
  // Params del flujo restaurante (opcionales para flujo tienda)
  orderType?:       string
  driverId?:        string | null
  restaurantSlug?:  string
  shortId?:         string
  // Params del flujo tienda (cotización)
  restaurantId?:    string
  orderTotal?:      number
  deliveryFee?:     number
  rejectionMessage?: string
  isPaid?:          boolean  // true = tarjeta, false = efectivo al recibir
}) {
  const {
    orderId, newStatus,
    orderType, driverId, restaurantSlug, shortId,
    restaurantId, orderTotal, deliveryFee, rejectionMessage, isPaid,
  } = params
  const isDelivery = orderType === 'delivery'
  const trackUrl   = restaurantSlug ? `/${restaurantSlug}/order/${orderId}` : `/order/${orderId}`
  const id         = shortId ?? orderId.slice(-5).toUpperCase()

  switch (newStatus) {

    // ── Flujo tienda ──────────────────────────────────────────
    case 'quoted':
      await notifyOrderCustomer(orderId, {
        title: '💰 Tu pedido fue cotizado',
        body:  orderTotal
          ? `${fmt(orderTotal)}${deliveryFee ? ` (envío ${fmt(deliveryFee)})` : ''}. ¡Revísalo y acepta!`
          : 'La tienda cotizó tu pedido. ¡Revísalo!',
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      break

    case 'quote_rejected':
      if (restaurantId) {
        await notifyRestaurant(restaurantId, {
          title: '🤝 Cliente quiere negociar',
          body:  rejectionMessage ? `#${id}: "${rejectionMessage}"` : `Pedido #${id} — enviaron propuesta`,
          url:   '/dashboard/orders',
          tag:   `quote-rejected-${orderId}`,
        })
      }
      break

    // ── Flujo restaurante / común ─────────────────────────────
    case 'accepted':
      await notifyOrderCustomer(orderId, {
        title: '✅ Pedido aceptado',
        body:  `Tu pedido #${id} fue confirmado`,
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      if (restaurantId && orderTotal) {
        const paymentNote = isPaid
          ? `💳 Pago de ${fmt(orderTotal)} recibido con tarjeta`
          : `💵 Cobrar ${fmt(orderTotal)} al cliente`
        await notifyRestaurant(restaurantId, {
          title: '✅ Cliente aceptó el pedido',
          body:  `${paymentNote} — #${id}`,
          url:   '/dashboard/orders',
          tag:   `accepted-${orderId}`,
        })
      } else if (restaurantId) {
        await notifyRestaurant(restaurantId, {
          title: '✅ Cliente aceptó el pedido',
          body:  `Pedido #${id} confirmado`,
          url:   '/dashboard/orders',
          tag:   `accepted-${orderId}`,
        })
      }
      if (isDelivery) {
        await notifyAllDrivers({
          title: '🛵 Nueva entrega disponible',
          body:  `Pedido #${id} listo para ser tomado`,
          url:   '/driver',
          tag:   `driver-available-${orderId}`,
        })
      }
      break

    case 'preparing':
      await notifyOrderCustomer(orderId, {
        title: '👨‍🍳 Preparando tu pedido',
        body:  `Están preparando tu pedido #${id}`,
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
          body:  `Pedido #${id} — dirígete al negocio`,
          url:   '/driver',
          tag:   `driver-ready-${orderId}`,
        })
      }
      break

    case 'on_the_way':
      await notifyOrderCustomer(orderId, {
        title: '🛵 Tu pedido va en camino',
        body:  `El repartidor está en camino con tu pedido #${id}`,
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
        body:  `Tu pedido #${id} fue cancelado`,
        url:   trackUrl,
        tag:   `order-${orderId}`,
      })
      if (isDelivery && driverId) {
        await notifyAssignedDriver(driverId, {
          title: '❌ Pedido cancelado',
          body:  `El pedido #${id} fue cancelado`,
          url:   '/driver',
          tag:   `driver-cancelled-${orderId}`,
        })
      }
      break
  }
}
