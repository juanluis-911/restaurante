'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronRight, X, Bike, Car, Zap, Bell, BellOff, DollarSign, ShoppingBag, TrendingUp, Activity } from 'lucide-react'
import type { Database } from '@/types/database'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'
import { notifyOrderStatusChanged } from '@/lib/actions/push-actions'

type Order = Database['public']['Tables']['orders']['Row'] & {
  drivers?: { name: string; whatsapp: string; vehicle_type: 'moto' | 'carro' | 'bicicleta' } | null
}
type OrderStatus = Order['status']

const COLUMNS: { key: OrderStatus; label: string; color: string; nextLabel: string }[] = [
  { key: 'received',   label: 'Recibidos',  color: 'border-t-yellow-400',  nextLabel: 'Enviar a cocina' },
  { key: 'accepted',   label: 'En cola',    color: 'border-t-blue-400',    nextLabel: 'Empezar' },
  { key: 'preparing',  label: 'Cocinando',  color: 'border-t-orange-400',  nextLabel: 'Listo ✓' },
  { key: 'ready',      label: 'Listo',      color: 'border-t-green-500',   nextLabel: 'Terminado' },
  { key: 'on_the_way', label: 'En camino',  color: 'border-t-purple-400',  nextLabel: '' },
]

const STORE_COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'received',       label: 'Recibidos',   color: 'border-t-yellow-400' },
  { key: 'quoted',         label: 'Cotizados',   color: 'border-t-blue-400'   },
  { key: 'quote_rejected', label: 'Negociando',  color: 'border-t-amber-400'  },
  { key: 'accepted',       label: 'Aceptados',   color: 'border-t-green-400'  },
  { key: 'preparing',      label: 'Preparando',  color: 'border-t-orange-400' },
  { key: 'ready',          label: 'Listo',       color: 'border-t-green-500'  },
  { key: 'on_the_way',     label: 'En camino',   color: 'border-t-purple-400' },
]

// Dot + badge colors por columna
const COL_ACCENT: Record<string, { dot: string; badge: string; empty: string }> = {
  received:       { dot: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800',  empty: 'text-yellow-300' },
  accepted:       { dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-800',      empty: 'text-blue-300'   },
  quoted:         { dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-800',      empty: 'text-blue-300'   },
  quote_rejected: { dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-800',    empty: 'text-amber-300'  },
  preparing:      { dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-800',  empty: 'text-orange-300' },
  ready:          { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-800',    empty: 'text-green-300'  },
  on_the_way:     { dot: 'bg-purple-400', badge: 'bg-purple-100 text-purple-800',  empty: 'text-purple-300' },
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received:  'accepted',
  accepted:  'preparing',
  preparing: 'ready',
  ready:     'delivered',
}

const TYPE_LABEL: Record<string, string> = {
  dine_in:  'Mesa',
  pickup:   'Llevar',
  delivery: 'Delivery',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

interface Props {
  initialOrders:  Order[]
  restaurantId:   string
  restaurantSlug: string
  businessType?:  string
}

export default function OrdersKanban({ initialOrders, restaurantId, restaurantSlug, businessType }: Props) {
  const [orders,        setOrders]        = useState<Order[]>(initialOrders)
  const [history,       setHistory]       = useState<Order[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [view,          setView]          = useState<'kanban' | 'history'>('kanban')
  const [quoteOrder,    setQuoteOrder]    = useState<Order | null>(null)
  const [quoteSubtotal, setQuoteSubtotal] = useState('')
  const [quoteDelivery, setQuoteDelivery] = useState('')
  const [quoteMessage,  setQuoteMessage]  = useState('')
  const [quoteLoading,  setQuoteLoading]  = useState(false)
  const [connected,     setConnected]     = useState(false)
  const [highlightIds,  setHighlightIds]  = useState<Set<string>>(new Set())
  const [todayStats,    setTodayStats]    = useState<{ count: number; revenue: number } | null>(null)

  const isStore = businessType === 'store'
  const supabase = createClient()

  const { isSupported, isSubscribed, permissionState, subscribe } = usePushNotifications({
    type: 'restaurant',
    id:   restaurantId,
  })

  const knownOrderIds  = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)))
  const alertInterval  = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Sonido nuevo pedido (estilo UberEats) ─────────────────
  function playChime() {
    try {
      const ctx = new AudioContext()
      const tone = (
        freq: number, type: OscillatorType,
        start: number, attackEnd: number, releaseEnd: number, vol: number
      ) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = type
        osc.frequency.setValueAtTime(freq, start)
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(vol, attackEnd)
        gain.gain.exponentialRampToValueAtTime(0.001, releaseEnd)
        osc.start(start); osc.stop(releaseEnd)
      }
      const t = ctx.currentTime
      tone(190,  'triangle', t,        t + 0.01, t + 0.18, 0.55) // pulso 1
      tone(190,  'triangle', t + 0.22, t + 0.23, t + 0.40, 0.55) // pulso 2
      tone(1320, 'sine',     t + 0.38, t + 0.39, t + 0.85, 0.30) // campana
      setTimeout(() => ctx.close(), 1500)
    } catch { /* AudioContext no soportado */ }
  }

  // ── Alerta repetida cada 10s mientras haya pedidos sin atender ─
  function startAlert() {
    if (alertInterval.current) return          // ya está corriendo
    playChime()
    alertInterval.current = setInterval(playChime, 10_000)
  }

  function stopAlert() {
    if (!alertInterval.current) return
    clearInterval(alertInterval.current)
    alertInterval.current = null
  }

  // Arrancar/detener alerta según si hay pedidos 'received'
  useEffect(() => {
    const hasReceived = orders.some((o) => o.status === 'received')
    if (hasReceived) startAlert()
    else             stopAlert()
    return () => {}   // cleanup lo hace el useEffect de unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])

  // Limpiar al desmontar
  useEffect(() => () => stopAlert(), [])

  // ── Stats del día ──────────────────────────────────────────
  const fetchTodayStats = useCallback(async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('orders')
      .select('total, status')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', start.toISOString())
    if (data) {
      setTodayStats({
        count:   data.length,
        revenue: data.filter((o) => o.status === 'delivered').reduce((s, o) => s + Number(o.total), 0),
      })
    }
  }, [supabase, restaurantId])

  useEffect(() => { fetchTodayStats() }, [fetchTodayStats])

  // ── Órdenes activas ────────────────────────────────────────
  const fetchActive = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, drivers(name, whatsapp, vehicle_type)')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at', { ascending: true })
    if (data) {
      const incoming = data.filter((o) => !knownOrderIds.current.has(o.id))
      if (incoming.length > 0) {
        playChime()
        const ids = new Set(incoming.map((o) => o.id))
        setHighlightIds(ids)
        setTimeout(() => setHighlightIds(new Set()), 3000)
      }
      knownOrderIds.current = new Set(data.map((o) => o.id))
      setOrders(data as unknown as Order[])
      fetchTodayStats()
    }
  }, [supabase, restaurantId, fetchTodayStats])

  // ── Realtime ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`kanban:${restaurantId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => fetchActive())
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, supabase, fetchActive])

  async function loadHistory() {
    if (historyLoaded) return
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('status', ['delivered', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(100)
    setHistory(data ?? [])
    setHistoryLoaded(true)
  }

  async function advanceStatus(order: Order) {
    let next = NEXT_STATUS[order.status]
    if (order.status === 'ready' && order.order_type === 'delivery') next = 'on_the_way'
    if (!next) return

    const { error } = await supabase.from('orders').update({ status: next }).eq('id', order.id)
    if (error) { toast.error('No se pudo actualizar'); return }

    if (next === 'preparing') {
      await supabase.from('kitchen_tickets').update({ status: 'cooking' }).eq('order_id', order.id).eq('status', 'queued')
    } else if (next === 'ready') {
      await supabase.from('kitchen_tickets').update({ status: 'done' }).eq('order_id', order.id).neq('status', 'done')
    }

    if (next === 'delivered') toast.success('Pedido terminado ✓')
    if (next === 'on_the_way') toast.success('Pedido entregado al repartidor 🛵')

    notifyOrderStatusChanged({
      orderId: order.id, newStatus: next, orderType: order.order_type,
      driverId: order.driver_id ?? null, restaurantSlug,
      shortId: order.id.slice(-5).toUpperCase(),
    }).catch(() => {})
  }

  async function cancelOrder(order: Order) {
    if (!confirm(`¿Cancelar el pedido de ${order.customer_name}?`)) return
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    if (error) { toast.error('No se pudo cancelar'); return }
    toast.warning('Pedido cancelado')
    notifyOrderStatusChanged({
      orderId: order.id, newStatus: 'cancelled', orderType: order.order_type,
      driverId: order.driver_id ?? null, restaurantSlug,
      shortId: order.id.slice(-5).toUpperCase(),
    }).catch(() => {})
  }

  async function submitQuote() {
    if (!quoteOrder) return
    const subtotal = parseFloat(quoteSubtotal)
    if (isNaN(subtotal) || subtotal <= 0) { toast.error('Ingresa un precio válido'); return }
    setQuoteLoading(true)
    try {
      const res = await fetch(`/api/orders/${quoteOrder.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtotal,
          delivery_fee: parseFloat(quoteDelivery) || 0,
          quote_message: quoteMessage || null,
        }),
      })
      if (!res.ok) throw new Error('Error al cotizar')
      toast.success('Cotización enviada al cliente ✓')
      setQuoteOrder(null); setQuoteSubtotal(''); setQuoteDelivery(''); setQuoteMessage('')
    } catch { toast.error('No se pudo enviar la cotización') }
    finally { setQuoteLoading(false) }
  }

  // ── Helpers de render ──────────────────────────────────────
  function ColHeader({ colKey, label, count }: { colKey: string; label: string; count: number }) {
    const accent = COL_ACCENT[colKey] ?? COL_ACCENT.received
    return (
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${accent.dot}`} />
        <span className="font-semibold text-sm text-slate-700 flex-1">{label}</span>
        {count > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${accent.badge}`}>{count}</span>
        )}
      </div>
    )
  }

  function ColEmpty({ colKey }: { colKey: string }) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-center rounded-xl border border-dashed border-slate-200 bg-white/60">
        <span className={`text-2xl opacity-30 ${COL_ACCENT[colKey]?.empty ?? ''}`}>◯</span>
        <span className="text-xs text-muted-foreground/60">Sin pedidos</span>
      </div>
    )
  }

  const totalActive = orders.length

  return (
    <div className="space-y-4">

      {/* ── Stats del día ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Activity size={15} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Activos ahora</p>
            <p className="text-xl font-bold text-slate-800 leading-none">{totalActive}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <ShoppingBag size={15} className="text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Pedidos hoy</p>
            <p className="text-xl font-bold text-slate-800 leading-none">
              {todayStats?.count ?? <span className="text-sm text-muted-foreground">…</span>}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <TrendingUp size={15} className="text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Ingresos hoy</p>
            <p className="text-base font-bold text-slate-800 leading-none truncate">
              {todayStats ? fmt(todayStats.revenue) : <span className="text-sm text-muted-foreground">…</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs + notificaciones ───────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              view === 'kanban' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-border'
            }`}
          >
            {/* Indicador live */}
            <span className="relative flex h-2 w-2">
              {connected
                ? <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></>
                : <span className="inline-flex rounded-full h-2 w-2 bg-slate-300" />
              }
            </span>
            Órdenes activas
            {totalActive > 0 && (
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full leading-none">{totalActive}</span>
            )}
          </button>
          <button
            onClick={() => { setView('history'); loadHistory() }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              view === 'history' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-border'
            }`}
          >
            Historial
          </button>
        </div>

        {isSupported && permissionState === 'default' && (
          <button
            onClick={async () => {
              const ok = await subscribe()
              if (ok) toast.success('Notificaciones activadas ✓')
              else    toast.error('No se pudo activar las notificaciones')
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:bg-muted border-border text-muted-foreground"
          >
            <BellOff size={13} /> Activar notificaciones
          </button>
        )}
        {isSupported && permissionState === 'granted' && isSubscribed && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 border border-green-200 text-green-700">
            <Bell size={13} /> Notificaciones activas
          </span>
        )}
      </div>

      {/* ── Empty state global (sin órdenes activas) ────────── */}
      {view === 'kanban' && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-3xl">
            🎉
          </div>
          <h3 className="text-base font-semibold text-slate-700">Todo tranquilo por ahora</h3>
          <p className="text-sm text-muted-foreground mt-1">Los pedidos aparecerán aquí en tiempo real</p>
          <div className="flex items-center gap-1.5 mt-4 text-xs text-green-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Escuchando pedidos nuevos
          </div>
        </div>
      )}

      {/* ── Kanban Restaurante ────────────────────────────────── */}
      {view === 'kanban' && !isStore && orders.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(({ key, label, color, nextLabel }) => {
            const colOrders = orders.filter((o) => o.status === key)
            const isReadyCol = key === 'ready'

            return (
              <div key={key} className="flex-shrink-0 w-64 bg-slate-50/70 rounded-xl p-3">
                <ColHeader colKey={key} label={label} count={colOrders.length} />

                <div className="space-y-2">
                  {colOrders.length === 0 && <ColEmpty colKey={key} />}

                  {colOrders.map((order) => {
                    const items = order.items as { name: string; quantity: number }[]
                    const isDeliverable = key === 'ready'
                    const cardNextLabel = (key === 'ready' && order.order_type === 'delivery')
                      ? 'Entregar 🛵' : nextLabel
                    const isNew = highlightIds.has(order.id)

                    return (
                      <Card key={order.id} className={`border-t-2 ${color} shadow-sm transition-all duration-500 ${
                        isNew ? 'ring-2 ring-yellow-300 ring-offset-1 shadow-yellow-100' : ''
                      }`}>
                        <CardHeader className="p-3 pb-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <span className="font-bold text-sm">#{order.id.slice(-5).toUpperCase()}</span>
                              <p className="font-medium text-sm truncate">{order.customer_name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge variant="outline" className="text-xs">{TYPE_LABEL[order.order_type]}</Badge>
                              <Badge variant="secondary" className="text-xs">
                                {order.source === 'pos' ? 'POS' : 'Online'}
                              </Badge>
                              {order.stripe_session_id && (
                                <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
                                  💳 Pagado
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </CardHeader>

                        <CardContent className="p-3 pt-0">
                          <ul className="text-xs text-muted-foreground space-y-0.5 mb-2 border-t pt-2">
                            {(items as { name: string; quantity: number }[]).map((item, i) => (
                              <li key={i} className="flex gap-1">
                                <span className="font-medium text-foreground">{item.quantity}x</span>
                                <span className="truncate">{item.name}</span>
                              </li>
                            ))}
                          </ul>

                          {order.notes && (
                            <p className="text-xs bg-yellow-50 text-yellow-800 rounded px-2 py-1 mb-2">
                              📝 {order.notes}
                            </p>
                          )}
                          {order.table_number && (
                            <p className="text-xs text-muted-foreground mb-2">🪑 Mesa {order.table_number}</p>
                          )}

                          {order.order_type === 'delivery' && (() => {
                            const VIcon = order.drivers
                              ? { moto: Zap, carro: Car, bicicleta: Bike }[order.drivers.vehicle_type]
                              : null
                            return (
                              <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded mb-2 ${
                                order.drivers ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {order.drivers && VIcon ? <><VIcon size={11} />{order.drivers.name}</> : <>🛵 Sin repartidor</>}
                              </div>
                            )
                          })()}

                          <p className="font-bold text-sm mb-2">{fmt(Number(order.total))}</p>

                          <div className="flex gap-1">
                            {cardNextLabel ? (
                              <Button
                                size="sm"
                                className={`flex-1 h-7 text-xs ${isDeliverable ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => advanceStatus(order)}
                              >
                                {cardNextLabel} <ChevronRight size={11} className="ml-1" />
                              </Button>
                            ) : (
                              <div className="flex-1 flex items-center justify-center h-7 text-xs text-purple-600 font-medium bg-purple-50 rounded-md">
                                🛵 Con repartidor
                              </div>
                            )}
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => cancelOrder(order)}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Kanban Tiendas ────────────────────────────────────── */}
      {view === 'kanban' && isStore && orders.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STORE_COLUMNS.map(({ key, label, color }) => {
            const colOrders = orders.filter((o) => o.status === key)

            return (
              <div key={key} className="flex-shrink-0 w-64 bg-slate-50/70 rounded-xl p-3">
                <ColHeader colKey={key} label={label} count={colOrders.length} />

                <div className="space-y-2">
                  {colOrders.length === 0 && <ColEmpty colKey={key} />}

                  {colOrders.map((order) => {
                    const items = order.items as { name: string; quantity: number }[]
                    const extOrder = order as typeof order & { order_text?: string | null; rejection_message?: string | null }
                    const isNew = highlightIds.has(order.id)

                    return (
                      <Card key={order.id} className={`border-t-2 ${color} shadow-sm transition-all duration-500 ${
                        isNew ? 'ring-2 ring-yellow-300 ring-offset-1 shadow-yellow-100' : ''
                      }`}>
                        <CardHeader className="p-3 pb-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <span className="font-bold text-sm">#{order.id.slice(-5).toUpperCase()}</span>
                              <p className="font-medium text-sm truncate">{order.customer_name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge variant="outline" className="text-xs">{TYPE_LABEL[order.order_type]}</Badge>
                              {order.stripe_session_id && (
                                <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
                                  💳 Pagado
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </CardHeader>

                        <CardContent className="p-3 pt-0 space-y-2">
                          {items.length > 0 && (
                            <ul className="text-xs text-muted-foreground space-y-0.5 border-t pt-2">
                              {items.map((item, i) => (
                                <li key={i} className="flex gap-1">
                                  <span className="font-medium text-foreground">{item.quantity}x</span>
                                  <span className="truncate">{item.name}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {extOrder.order_text && (
                            <p className="text-xs bg-blue-50 text-blue-800 rounded px-2 py-1.5 leading-relaxed">
                              📝 {extOrder.order_text}
                            </p>
                          )}

                          {key === 'quote_rejected' && extOrder.rejection_message && (
                            <div className="text-xs bg-amber-50 text-amber-700 rounded px-2 py-2 border-l-2 border-amber-400">
                              <p className="font-medium text-[10px] uppercase tracking-wide text-amber-500 mb-0.5">Propuesta del cliente</p>
                              <p className="italic">&ldquo;{extOrder.rejection_message}&rdquo;</p>
                            </div>
                          )}

                          {Number(order.total) > 0 && (
                            <p className="font-bold text-sm">{fmt(Number(order.total))}</p>
                          )}

                          <div className="flex gap-1">
                            {(key === 'received' || key === 'quote_rejected') && (
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                onClick={() => { setQuoteOrder(order); setQuoteSubtotal(''); setQuoteDelivery(''); setQuoteMessage('') }}
                              >
                                <DollarSign size={11} className="mr-1" />
                                {key === 'quote_rejected' ? 'Responder propuesta' : 'Establecer precio'}
                              </Button>
                            )}
                            {key === 'accepted' && (
                              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => advanceStatus(order)}>
                                Empezar <ChevronRight size={11} className="ml-1" />
                              </Button>
                            )}
                            {key === 'preparing' && (
                              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => advanceStatus(order)}>
                                Listo ✓ <ChevronRight size={11} className="ml-1" />
                              </Button>
                            )}
                            {key === 'ready' && (
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => advanceStatus(order)}
                              >
                                {order.order_type === 'delivery' ? 'Entregar 🛵' : 'Terminado'} <ChevronRight size={11} className="ml-1" />
                              </Button>
                            )}
                            {key === 'quoted' && (
                              <div className="flex-1 flex items-center justify-center h-7 text-xs text-blue-600 font-medium bg-blue-50 rounded-md">
                                ⏳ Esperando cliente
                              </div>
                            )}
                            {key === 'on_the_way' && (
                              <div className="flex-1 flex items-center justify-center h-7 text-xs text-purple-600 font-medium bg-purple-50 rounded-md">
                                🛵 Con repartidor
                              </div>
                            )}
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => cancelOrder(order)}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal cotización ──────────────────────────────────── */}
      {quoteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Establecer precio</h3>
              <button onClick={() => setQuoteOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Pedido #{quoteOrder.id.slice(-5).toUpperCase()} — {quoteOrder.customer_name}
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Precio del pedido ($) *</label>
                <input
                  type="number" min="0" step="0.01" placeholder="Ej: 320"
                  value={quoteSubtotal}
                  onChange={(e) => setQuoteSubtotal(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Costo de envío ($)</label>
                <input
                  type="number" min="0" step="0.01" placeholder="Ej: 40 (dejar en 0 si no aplica)"
                  value={quoteDelivery}
                  onChange={(e) => setQuoteDelivery(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Mensaje al cliente <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <textarea
                  rows={2}
                  placeholder="Ej: No hay mango hoy, te sugerimos papaya. El aguacate está en temporada 🥑"
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              {quoteSubtotal && (
                <div className="rounded-xl bg-slate-50 border px-3 py-2 flex justify-between text-sm font-semibold">
                  <span>Total a cobrar</span>
                  <span>{fmt((parseFloat(quoteSubtotal) || 0) + (parseFloat(quoteDelivery) || 0))}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setQuoteOrder(null)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={submitQuote}
                disabled={quoteLoading || !quoteSubtotal}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {quoteLoading ? 'Enviando…' : 'Enviar cotización'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Historial ─────────────────────────────────────────── */}
      {view === 'history' && (
        <div>
          {!historyLoaded && (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
          )}
          {historyLoaded && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-3xl mb-3">📋</div>
              <p className="text-sm text-muted-foreground">No hay pedidos finalizados aún</p>
            </div>
          )}
          {historyLoaded && history.length > 0 && (
            <div className="border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Origen</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wide">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {history.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{order.id.slice(-5).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 font-medium">{order.customer_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{TYPE_LABEL[order.order_type]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">
                          {order.source === 'pos' ? 'POS' : 'Online'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold">{fmt(Number(order.total))}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={order.status === 'delivered' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {order.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
