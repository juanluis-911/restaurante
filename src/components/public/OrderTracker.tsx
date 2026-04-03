'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/helpers'
import { Clock, MessageCircle, Bike, Car, Zap, User, ChevronRight, MapPin, Receipt } from 'lucide-react'
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
  { key: 'received',   label: 'Recibido',        desc: 'El restaurante recibió tu pedido',     icon: '📥' },
  { key: 'accepted',   label: 'Aceptado',         desc: 'Confirmaron tu pedido',                icon: '✅' },
  { key: 'preparing',  label: 'En preparación',   desc: 'Están cocinando tu pedido',            icon: '👨‍🍳' },
  { key: 'ready',      label: 'Listo',            desc: 'Tu pedido está listo para entregar',   icon: '🎉' },
  { key: 'on_the_way', label: 'En camino',        desc: 'Tu pedido está en camino',             icon: '🛵' },
  { key: 'delivered',  label: 'Entregado',        desc: '¡Tu pedido llegó! Buen provecho 🍽️',  icon: '🏠' },
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

  const currentIdx    = order.status === 'cancelled' ? -1 : (STATUS_INDEX[order.status] ?? 0)
  const currentStep   = STATUS_STEPS[currentIdx]
  const items         = order.items as { name: string; quantity: number; unit_price?: number; subtotal?: number }[]
  const primaryColor  = restaurant?.primary_color ?? '#E53E3E'
  const isDelivered   = order.status === 'delivered'

  if (order.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border p-8 text-center max-w-sm w-full space-y-3">
          <div className="text-6xl">😔</div>
          <h1 className="text-xl font-bold text-slate-800">Pedido cancelado</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tu pedido #{order.id.slice(-6).toUpperCase()} fue cancelado.
            {restaurant?.phone && (
              <> Llama al <span className="font-medium text-slate-700">{restaurant.phone}</span> si tienes dudas.</>
            )}
          </p>
          <a href="/cliente" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Ver mis pedidos <ChevronRight size={14} />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative text-white overflow-hidden" style={{ backgroundColor: primaryColor }}>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -left-6 w-36 h-36 rounded-full bg-black/10 pointer-events-none" />

        {/* Account button */}
        <a
          href="/cliente"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title="Mi cuenta"
        >
          <User size={17} />
        </a>

        <div className="relative px-5 pt-8 pb-6">
          {/* Restaurant name + logo */}
          <div className="flex items-center gap-2.5 mb-4">
            {restaurant?.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="h-8 w-8 rounded-lg object-cover bg-white/20" />
            ) : null}
            <p className="text-sm font-medium opacity-80">{restaurant?.name}</p>
          </div>

          {/* Status hero */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl">
              {currentStep?.icon}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70 mb-0.5">Estado actual</p>
              <h1 className="text-2xl font-bold leading-tight">{currentStep?.label}</h1>
              <p className="text-sm opacity-80 mt-0.5">{currentStep?.desc}</p>
            </div>
          </div>

          {/* Order meta row */}
          <div className="flex items-center gap-3">
            <span className="bg-white/20 rounded-full px-3 py-1 text-xs font-mono font-semibold tracking-wider">
              #{order.id.slice(-6).toUpperCase()}
            </span>
            {order.estimated_time_min && !isDelivered && (
              <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-medium">
                <Clock size={11} />
                ~{order.estimated_time_min} min
              </span>
            )}
            {isDelivered && (
              <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-medium">
                ✓ Completado
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">

        {/* ── Progress stepper ───────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="text-sm font-semibold text-slate-800">Seguimiento del pedido</h2>
          </div>
          <div className="px-5 py-4">
            <div className="space-y-0">
              {STATUS_STEPS.map((step, idx) => {
                const done    = idx < currentIdx
                const active  = idx === currentIdx
                const pending = idx > currentIdx
                const isLast  = idx === STATUS_STEPS.length - 1

                return (
                  <div key={step.key} className="flex gap-4">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition-all ${
                          done    ? 'bg-slate-800 text-white' :
                          active  ? 'text-white ring-4 ring-offset-1 shadow-md' :
                          'bg-slate-100 text-slate-300'
                        }`}
                        style={active ? { backgroundColor: primaryColor } : undefined}
                      >
                        {done ? '✓' : step.icon}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 my-1 min-h-[20px] rounded-full transition-colors ${done ? 'bg-slate-800' : 'bg-slate-100'}`} />
                      )}
                    </div>

                    {/* Label */}
                    <div className={`pb-4 pt-0.5 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                      <p className={`text-sm leading-snug ${
                        done    ? 'text-slate-500 line-through decoration-slate-300' :
                        active  ? 'font-semibold text-slate-900' :
                        'text-slate-300'
                      }`}>
                        {step.label}
                      </p>
                      {active && (
                        <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Driver card ────────────────────────────────── */}
        {order.drivers && ['on_the_way', 'delivered'].includes(order.status) && (() => {
          const d = order.drivers!
          const DriverIcon = VEHICLE_ICON[d.vehicle_type]
          const wa = d.whatsapp.replace(/\D/g, '')
          return (
            <div className="bg-white rounded-2xl shadow-sm border p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Tu repartidor</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white text-lg font-bold"
                    style={{ backgroundColor: primaryColor }}>
                    {d.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{d.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <DriverIcon size={11} />
                      {VEHICLE_LABEL[d.vehicle_type]}
                    </div>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
              </div>
            </div>
          )
        })()}

        {/* ── Order summary ──────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Receipt size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-slate-800">Resumen del pedido</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {item.quantity}
                  </span>
                  <span className="text-sm text-slate-700 truncate">{item.name}</span>
                </div>
                {(item.subtotal ?? item.unit_price) && (
                  <span className="text-sm text-slate-500 shrink-0">
                    {formatCurrency((item.subtotal ?? (item.unit_price! * item.quantity)))}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Total</span>
            <span className="text-base font-bold text-slate-900">{formatCurrency(Number(order.total))}</span>
          </div>
          {order.stripe_session_id && (
            <div className="px-5 py-2.5 border-t flex items-center gap-2 text-xs text-violet-700 bg-violet-50">
              💳 <span>Pagado con tarjeta</span>
            </div>
          )}
        </div>

        {/* ── Order type ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
            {order.order_type === 'delivery' ? '🛵' : order.order_type === 'pickup' ? '🏃' : '🪑'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {order.order_type === 'delivery' ? 'A domicilio' : order.order_type === 'pickup' ? 'Para llevar' : `Mesa ${order.table_number ?? ''}`}
            </p>
            {order.order_type === 'delivery' && order.delivery_address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={10} className="shrink-0" />
                {(order.delivery_address as { street?: string }).street}
              </p>
            )}
          </div>
        </div>

        {/* ── Mi cuenta ──────────────────────────────────── */}
        <a
          href="/cliente"
          className="flex items-center justify-between bg-white rounded-2xl shadow-sm border px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-sm" style={{ backgroundColor: primaryColor }}>
              <User size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Mi cuenta</p>
              <p className="text-xs text-muted-foreground">Ver mis pedidos y direcciones</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </a>

      </div>
    </div>
  )
}
