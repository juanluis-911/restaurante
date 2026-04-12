'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/helpers'
import { Clock, MessageCircle, Bike, Car, Zap, User, ChevronRight, MapPin, Receipt, Bell, CreditCard, Banknote, X } from 'lucide-react'
import type { Database } from '@/types/database'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

type Order = Database['public']['Tables']['orders']['Row'] & {
  restaurants: {
    name: string
    primary_color: string
    slug: string
    logo_url?: string | null
    phone?: string | null
    cash_enabled?: boolean
    stripe_account_status?: string
    stripe_account_id?: string | null
    card_enabled?: boolean
    business_type?: string | null
  } | null
  drivers?: {
    name: string
    whatsapp: string
    vehicle_type: 'moto' | 'carro' | 'bicicleta'
  } | null
}

const VEHICLE_ICON = { moto: Zap, carro: Car, bicicleta: Bike }
const VEHICLE_LABEL = { moto: 'Moto', carro: 'Carro', bicicleta: 'Bicicleta' }

function getStatusSteps(isStore: boolean) {
  return [
    { key: 'received',   label: 'Recibido',        desc: isStore ? 'La tienda recibió tu pedido'          : 'El restaurante recibió tu pedido',    icon: '📥' },
    { key: 'accepted',   label: 'Aceptado',         desc: isStore ? 'Confirmaron tu pedido y lo preparan'  : 'Confirmaron tu pedido',               icon: '✅' },
    { key: 'preparing',  label: 'En preparación',   desc: isStore ? 'Están preparando tu pedido'           : 'Están cocinando tu pedido',           icon: isStore ? '📦' : '👨‍🍳' },
    { key: 'ready',      label: 'Listo',            desc: isStore ? 'Tu pedido está listo para entregar'   : 'Tu pedido está listo para entregar',  icon: '🎉' },
    { key: 'on_the_way', label: 'En camino',        desc: 'Tu pedido está en camino',                                                               icon: '🛵' },
    { key: 'delivered',  label: 'Entregado',        desc: isStore ? '¡Tu pedido llegó! 🛍️'                 : '¡Tu pedido llegó! Buen provecho 🍽️', icon: '🏠' },
  ]
}

const STATUS_INDEX: Record<string, number> = Object.fromEntries(
  getStatusSteps(false).map((s, i) => [s.key, i])
)

interface Props {
  initialOrder: Order
}

export default function OrderTracker({ initialOrder }: Props) {
  const [order, setOrder]             = useState<Order>(initialOrder)
  const [rejectionOpen, setRejectionOpen] = useState(false)
  const [rejectionText, setRejectionText] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const supabase = createClient()
  const restaurant = order.restaurants

  const { isSupported, isSubscribed, permissionState, subscribe } = usePushNotifications({
    type: 'order',
    id:   order.id,
  })

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

  const isStore         = restaurant?.business_type === 'store'
  const isQuoted        = order.status === 'quoted'
  const isQuoteRejected = order.status === 'quote_rejected'
  // Para el stepper: quoted/quote_rejected se muestran en "Recibido"
  const stepperStatus   = (isQuoted || isQuoteRejected) ? 'received' : order.status
  const currentIdx    = stepperStatus === 'cancelled' ? -1 : (STATUS_INDEX[stepperStatus] ?? 0)
  const STATUS_STEPS  = getStatusSteps(isStore)
  const currentStep   = STATUS_STEPS[currentIdx]
  const items         = order.items as { name: string; quantity: number; unit_price?: number; subtotal?: number }[]
  const primaryColor  = restaurant?.primary_color ?? '#E53E3E'
  const isDelivered   = order.status === 'delivered'
  const hasStripe     = restaurant?.stripe_account_status === 'active' && !!restaurant?.stripe_account_id && (restaurant?.card_enabled ?? true)
  const hasCash       = restaurant?.cash_enabled ?? true

  async function acceptCash() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/accept-quote`, { method: 'POST' })
      if (!res.ok) throw new Error('Error al aceptar')
      setOrder((p) => ({ ...p, status: 'accepted' }))
    } catch { /* silencioso, realtime actualizará */ }
    finally { setActionLoading(false) }
  }

  async function acceptStripe() {
    setActionLoading(true)
    try {
      const res = await fetch('/api/stripe/store-quote-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, slug: restaurant?.slug }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Error')
      window.location.href = data.url
    } catch { setActionLoading(false) }
  }

  async function rejectQuote() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/reject-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: rejectionText }),
      })
      if (!res.ok) throw new Error('Error al rechazar')
      setOrder((p) => ({ ...p, status: 'quote_rejected', rejection_message: rejectionText }))
      setRejectionOpen(false)
      setRejectionText('')
    } catch { /* silencioso */ }
    finally { setActionLoading(false) }
  }

  if (order.status === 'cancelled') {
    const waNumber = restaurant?.phone?.replace(/\D/g, '')
    const waText   = encodeURIComponent(
      `Hola, mi pedido #${order.id.slice(-6).toUpperCase()} fue cancelado. ¿Pueden ayudarme?`
    )
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border p-8 text-center max-w-sm w-full space-y-4">
          <div className="text-6xl">😔</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Pedido cancelado</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Tu pedido #{order.id.slice(-6).toUpperCase()} fue cancelado.
            </p>
          </div>
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold px-5 py-3 rounded-2xl transition-all text-sm"
            >
              <MessageCircle size={16} />
              Contactar a {restaurant?.name} por WhatsApp
            </a>
          )}
          <a href="/cliente" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors">
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
          <div className="flex items-center gap-3 flex-wrap">
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
            {isSupported && !isDelivered && permissionState === 'default' && (
              <button
                onClick={async () => { await subscribe() }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors bg-white/10 hover:bg-white/25 border border-white/30"
                title="Activar notificaciones de este pedido"
              >
                <Bell size={11} />
                Notificarme
              </button>
            )}
            {isSupported && !isDelivered && permissionState === 'granted' && isSubscribed && (
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-white/20 cursor-default"
                title="Recibirás notificaciones de tu pedido"
              >
                <Bell size={11} />
                Notificaciones activas
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">

        {/* ── Cotización (solo tiendas) ───────────────────── */}
        {isQuoted && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ backgroundColor: primaryColor + '15' }}>
              <span className="text-lg">💰</span>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Tu pedido fue cotizado</h2>
                <p className="text-xs text-muted-foreground">Revisa el precio y acepta para continuar</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Mensaje del negocio */}
              {(order as Order & { quote_message?: string | null }).quote_message && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 flex gap-2">
                  <span className="text-base shrink-0">💬</span>
                  <p className="text-sm text-blue-800 leading-snug">
                    {(order as Order & { quote_message?: string | null }).quote_message}
                  </p>
                </div>
              )}

              <div className="rounded-xl border bg-slate-50 p-3 space-y-1.5">
                {order.delivery_fee > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.total - order.delivery_fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Envío</span>
                      <span>{formatCurrency(order.delivery_fee)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>{formatCurrency(order.total)}</span>
                </div>
              </div>

              {/* Botones */}
              <div className="space-y-2">
                {hasStripe && (
                  <button
                    onClick={acceptStripe}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                    style={{ backgroundColor: '#635BFF' }}
                  >
                    <CreditCard size={15} />
                    {actionLoading ? 'Redirigiendo…' : `Pagar con tarjeta · ${formatCurrency(order.total)}`}
                  </button>
                )}
                {hasCash && (
                  <button
                    onClick={acceptCash}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
                    style={!hasStripe ? { backgroundColor: primaryColor, color: 'white' } : { border: '1.5px solid #e2e8f0', color: '#334155' }}
                  >
                    <Banknote size={15} />
                    {actionLoading ? 'Aceptando…' : 'Pagar al recibir'}
                  </button>
                )}
                <button
                  onClick={() => setRejectionOpen(true)}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-amber-600 font-medium hover:bg-amber-50 transition-colors border border-amber-200 disabled:opacity-50"
                >
                  Negociar
                </button>
              </div>
            </div>
          </div>
        )}

        {isQuoteRejected && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Negociando tu pedido</p>
              <p className="text-xs text-amber-700 mt-0.5">Enviaste tu propuesta. La tienda revisará y te enviará una nueva cotización.</p>
              {(order as { rejection_message?: string | null }).rejection_message && (
                <p className="text-xs text-amber-600 mt-1.5 italic">
                  Tu propuesta: &ldquo;{(order as { rejection_message?: string | null }).rejection_message}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Modal rechazo ──────────────────────────────── */}
        {rejectionOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Negociar pedido</h3>
                <button onClick={() => setRejectionOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">¿Qué quieres cambiar o proponer? (opcional)</label>
                <textarea
                  value={rejectionText}
                  onChange={(e) => setRejectionText(e.target.value)}
                  placeholder="Ej: El precio está muy alto… o cambia los 2 kg de mango por sandía, o ya no quiero el aguacate"
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRejectionOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={rejectQuote}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {actionLoading ? 'Enviando…' : 'Enviar propuesta'}
                </button>
              </div>
            </div>
          </div>
        )}

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
            {/* Pedido libre (tiendas) */}
            {(order as { order_text?: string | null }).order_text && (
              <div className="rounded-xl bg-slate-50 border px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tu pedido</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {(order as { order_text?: string | null }).order_text}
                </p>
              </div>
            )}
            {/* Propuesta de negociación */}
            {(order as { rejection_message?: string | null }).rejection_message && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Tu propuesta</p>
                <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">
                  {(order as { rejection_message?: string | null }).rejection_message}
                </p>
              </div>
            )}
            {/* Paquetes seleccionados */}
            {items.length > 0 && (
              <>
                {(order as { order_text?: string | null }).order_text && (
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 pt-1">Paquetes agregados</p>
                )}
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
              </>
            )}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Total</span>
            <span className="text-base font-bold text-slate-900">
              {Number(order.total) > 0 ? formatCurrency(Number(order.total)) : 'Por cotizar'}
            </span>
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

        {/* ── Contactar al negocio (WhatsApp) ───────────── */}
        {restaurant?.phone && (() => {
          const waNumber = restaurant.phone!.replace(/\D/g, '')
          const waText   = encodeURIComponent(
            `Hola, tengo una pregunta sobre mi pedido #${order.id.slice(-6).toUpperCase()} 🙂`
          )
          return (
            <a
              href={`https://wa.me/${waNumber}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-white rounded-2xl shadow-sm border px-4 py-3.5 hover:bg-green-50 active:scale-[.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500 text-white">
                  <MessageCircle size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Contactar a {restaurant.name}</p>
                  <p className="text-xs text-muted-foreground">Enviar mensaje por WhatsApp</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </a>
          )
        })()}

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
