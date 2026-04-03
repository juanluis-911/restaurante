'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/helpers'
import { CheckCircle2, Circle, Clock, MessageCircle, Bike, Car, Zap } from 'lucide-react'
import type { Database } from '@/types/database'

type Order = Database['public']['Tables']['orders']['Row'] & {
  restaurants: {
    name: string
    primary_color: string
    logo_url?: string | null
    phone?: string | null
  } | null
  drivers?: {
    name: string
    whatsapp: string
    vehicle_type: 'moto' | 'carro' | 'bicicleta'
  } | null
}

const VEHICLE_ICON = { moto: Zap, carro: Car, bicicleta: Bike }
const VEHICLE_LABEL = { moto: 'Moto', carro: 'Carro', bicicleta: 'Bicicleta' }

const STATUS_STEPS = [
  { key: 'received',   label: 'Pedido recibido',     icon: '📥' },
  { key: 'accepted',   label: 'Pedido aceptado',      icon: '✅' },
  { key: 'preparing',  label: 'En preparación',       icon: '👨‍🍳' },
  { key: 'ready',      label: 'Listo para entregar',  icon: '🎉' },
  { key: 'on_the_way', label: 'En camino',            icon: '🛵' },
  { key: 'delivered',  label: 'Entregado',            icon: '🏠' },
]

const STATUS_INDEX: Record<string, number> = Object.fromEntries(
  STATUS_STEPS.map((s, i) => [s.key, i])
)

interface Props {
  initialOrder: Order
}

export default function OrderTracker({ initialOrder }: Props) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const supabase = createClient()
  const restaurant = order.restaurants

  useEffect(() => {
    const channel = supabase
      .channel(`order-track:${order.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${order.id}`,
      }, ({ new: updated }) => {
        setOrder((prev) => ({ ...prev, ...updated }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [order.id, supabase])

  const currentIdx = order.status === 'cancelled' ? -1 : (STATUS_INDEX[order.status] ?? 0)
  const items = order.items as { name: string; quantity: number }[]
  const primaryColor = restaurant?.primary_color ?? '#E53E3E'

  if (order.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border p-8 text-center max-w-sm w-full">
          <p className="text-5xl mb-4">😔</p>
          <h1 className="text-xl font-bold mb-2">Pedido cancelado</h1>
          <p className="text-muted-foreground text-sm">
            Tu pedido #{order.id.slice(-6).toUpperCase()} fue cancelado.
            {restaurant?.phone && ` Llama al ${restaurant.phone} si tienes dudas.`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white py-6 px-4 text-center" style={{ backgroundColor: primaryColor }}>
        <p className="text-sm opacity-80 mb-1">{restaurant?.name}</p>
        <h1 className="text-2xl font-bold">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
        <p className="text-sm opacity-80 mt-1">{order.customer_name}</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Progress */}
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-semibold mb-4">Estado del pedido</h2>
          <div className="space-y-3">
            {STATUS_STEPS.map((step, idx) => {
              const done = idx < currentIdx
              const active = idx === currentIdx
              const pending = idx > currentIdx

              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="shrink-0">
                    {done ? (
                      <CheckCircle2 size={20} style={{ color: primaryColor }} />
                    ) : active ? (
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: primaryColor }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                      </div>
                    ) : (
                      <Circle size={20} className="text-gray-200" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${pending ? 'text-muted-foreground' : active ? 'font-semibold' : ''}`}>
                      {step.icon} {step.label}
                    </span>
                    {active && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white animate-pulse"
                        style={{ backgroundColor: primaryColor }}>
                        Ahora
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-semibold mb-3">Tu pedido</h2>
          <ul className="space-y-1.5 text-sm mb-3">
            {items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
              </li>
            ))}
          </ul>
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(Number(order.total))}</span>
          </div>
          {order.stripe_session_id && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-1.5">
              💳 Pagado con tarjeta
            </div>
          )}
        </div>

        {/* Tipo de orden */}
        <div className="bg-white rounded-2xl border p-4 flex items-center gap-3">
          <span className="text-2xl">
            {order.order_type === 'delivery' ? '🛵' : order.order_type === 'pickup' ? '🏃' : '🪑'}
          </span>
          <div>
            <p className="font-medium text-sm">
              {order.order_type === 'delivery' ? 'Servicio a domicilio' : order.order_type === 'pickup' ? 'Para llevar' : `Mesa ${order.table_number ?? ''}`}
            </p>
            {order.order_type === 'delivery' && order.delivery_address && (
              <p className="text-xs text-muted-foreground">
                {(order.delivery_address as { street?: string }).street}
              </p>
            )}
          </div>
        </div>

        {/* Tarjeta del repartidor */}
        {order.drivers && ['on_the_way', 'delivered'].includes(order.status) && (() => {
          const d = order.drivers!
          const DriverIcon = VEHICLE_ICON[d.vehicle_type]
          const wa = d.whatsapp.replace(/\D/g, '')
          return (
            <div className="bg-white rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                  <DriverIcon size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tu repartidor</p>
                  <p className="font-semibold text-sm">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{VEHICLE_LABEL[d.vehicle_type]}</p>
                </div>
              </div>
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            </div>
          )
        })()}

        {/* Estimated time */}
        {order.estimated_time_min && order.status !== 'delivered' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <Clock size={14} />
            Tiempo estimado: ~{order.estimated_time_min} min
          </div>
        )}

        {/* Dashboard link */}
        <div className="text-center pb-2">
          <a
            href="/dashboard/orders"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Ir al dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
