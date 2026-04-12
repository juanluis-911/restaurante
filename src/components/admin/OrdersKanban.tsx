'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronRight, X, Bike, Car, Zap, Bell, BellOff, DollarSign } from 'lucide-react'
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

// Columnas para tiendas (flujo de cotización)
const STORE_COLUMNS: { key: string; label: string; color: string }[] = [
  { key: 'received',       label: 'Recibidos',   color: 'border-t-yellow-400' },
  { key: 'quoted',         label: 'Cotizados',   color: 'border-t-blue-400'   },
  { key: 'quote_rejected', label: 'Rechazados',  color: 'border-t-red-400'    },
  { key: 'accepted',       label: 'Aceptados',   color: 'border-t-green-400'  },
  { key: 'preparing',      label: 'Preparando',  color: 'border-t-orange-400' },
  { key: 'ready',          label: 'Listo',       color: 'border-t-green-500'  },
  { key: 'on_the_way',     label: 'En camino',   color: 'border-t-purple-400' },
]

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
  // Estado modal cotización
  const [quoteOrder,    setQuoteOrder]    = useState<Order | null>(null)
  const [quoteSubtotal, setQuoteSubtotal] = useState('')
  const [quoteDelivery, setQuoteDelivery] = useState('')
  const [quoteLoading,  setQuoteLoading]  = useState(false)
  const isStore = businessType === 'store'
  const supabase = createClient()

  const { isSupported, isSubscribed, subscribe } = usePushNotifications({
    type: 'restaurant',
    id:   restaurantId,
  })

  const fetchActive = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, drivers(name, whatsapp, vehicle_type)')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at', { ascending: true })
    if (data) setOrders(data as unknown as Order[])
  }, [supabase, restaurantId])

  useEffect(() => {
    const channel = supabase
      .channel(`kanban:${restaurantId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => fetchActive())
      .subscribe()
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
    // Delivery en 'ready' → on_the_way (el restaurante lo entrega al driver)
    // Otros → siguiente status normal
    let next = NEXT_STATUS[order.status]
    if (order.status === 'ready' && order.order_type === 'delivery') {
      next = 'on_the_way'
    }
    if (!next) return

    const { error } = await supabase
      .from('orders')
      .update({ status: next })
      .eq('id', order.id)

    if (error) { toast.error('No se pudo actualizar'); return }

    // Sincronizar kitchen_ticket
    if (next === 'preparing') {
      await supabase.from('kitchen_tickets')
        .update({ status: 'cooking' })
        .eq('order_id', order.id)
        .eq('status', 'queued')
    } else if (next === 'ready') {
      await supabase.from('kitchen_tickets')
        .update({ status: 'done' })
        .eq('order_id', order.id)
        .neq('status', 'done')
    }

    if (next === 'delivered') toast.success('Pedido terminado ✓')
    if (next === 'on_the_way') toast.success('Pedido entregado al repartidor 🛵')

    // Notificaciones push
    notifyOrderStatusChanged({
      orderId:        order.id,
      newStatus:      next,
      orderType:      order.order_type,
      driverId:       order.driver_id ?? null,
      restaurantSlug,
      shortId:        order.id.slice(-5).toUpperCase(),
    }).catch(() => {/* silencioso */})
  }

  async function cancelOrder(order: Order) {
    if (!confirm(`¿Cancelar el pedido de ${order.customer_name}?`)) return
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    if (error) { toast.error('No se pudo cancelar'); return }

    toast.warning('Pedido cancelado')

    notifyOrderStatusChanged({
      orderId:        order.id,
      newStatus:      'cancelled',
      orderType:      order.order_type,
      driverId:       order.driver_id ?? null,
      restaurantSlug,
      shortId:        order.id.slice(-5).toUpperCase(),
    }).catch(() => {/* silencioso */})
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
        body: JSON.stringify({ subtotal, delivery_fee: parseFloat(quoteDelivery) || 0 }),
      })
      if (!res.ok) throw new Error('Error al cotizar')
      toast.success('Cotización enviada al cliente ✓')
      setQuoteOrder(null)
      setQuoteSubtotal('')
      setQuoteDelivery('')
    } catch { toast.error('No se pudo enviar la cotización') }
    finally { setQuoteLoading(false) }
  }

  const totalActive = orders.length

  return (
    <div className="space-y-4">
      {/* Tabs + botón notificaciones */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('kanban')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${view === 'kanban' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-border'}`}
          >
            Órdenes activas
            {totalActive > 0 && (
              <span className="ml-2 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{totalActive}</span>
            )}
          </button>
          <button
            onClick={() => { setView('history'); loadHistory() }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${view === 'history' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-border'}`}
          >
            Historial
          </button>
        </div>

        {isSupported && (
          <button
            onClick={async () => {
              if (isSubscribed) return
              const ok = await subscribe()
              if (ok) toast.success('Notificaciones activadas ✓')
              else    toast.error('No se pudo activar las notificaciones')
            }}
            title={isSubscribed ? 'Notificaciones activas' : 'Activar notificaciones push'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              isSubscribed
                ? 'bg-green-50 border-green-200 text-green-700 cursor-default'
                : 'hover:bg-muted border-border text-muted-foreground'
            }`}
          >
            {isSubscribed ? <Bell size={13} /> : <BellOff size={13} />}
            {isSubscribed ? 'Notificaciones activas' : 'Activar notificaciones'}
          </button>
        )}
      </div>

      {/* ── Kanban ────────────────────────────────────────── */}
      {view === 'kanban' && !isStore && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(({ key, label, color, nextLabel }) => {
            const colOrders = orders.filter((o) => o.status === key)
            const isReadyCol = key === 'ready'

            return (
              <div key={key} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{label}</h3>
                  {colOrders.length > 0 && (
                    <Badge variant={isReadyCol ? 'default' : 'secondary'} className={`text-xs ${isReadyCol ? 'bg-green-500 border-0' : ''}`}>
                      {colOrders.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {colOrders.length === 0 && (
                    <div className="border border-dashed rounded-lg p-5 text-center text-xs text-muted-foreground">
                      Sin pedidos
                    </div>
                  )}

                  {colOrders.map((order) => {
                    const items = order.items as { name: string; quantity: number }[]
                    const isDeliverable = key === 'ready'
                    const cardNextLabel = (key === 'ready' && order.order_type === 'delivery')
                      ? 'Entregar 🛵'
                      : nextLabel

                    return (
                      <Card key={order.id} className={`border-t-2 ${color}`}>
                        <CardHeader className="p-3 pb-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <span className="font-bold text-sm">#{order.id.slice(-5).toUpperCase()}</span>
                              <p className="font-medium text-sm truncate">{order.customer_name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {TYPE_LABEL[order.order_type]}
                              </Badge>
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
                            {items.map((item, i) => (
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
                                {order.drivers && VIcon ? (
                                  <><VIcon size={11} />{order.drivers.name}</>
                                ) : (
                                  <>🛵 Sin repartidor</>
                                )}
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
                                {cardNextLabel}
                                <ChevronRight size={11} className="ml-1" />
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

      {/* ── Kanban Tiendas ────────────────────────────────── */}
      {view === 'kanban' && isStore && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STORE_COLUMNS.map(({ key, label, color }) => {
            const colOrders = orders.filter((o) => o.status === key)

            return (
              <div key={key} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{label}</h3>
                  {colOrders.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{colOrders.length}</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {colOrders.length === 0 && (
                    <div className="border border-dashed rounded-lg p-5 text-center text-xs text-muted-foreground">
                      Sin pedidos
                    </div>
                  )}

                  {colOrders.map((order) => {
                    const items = order.items as { name: string; quantity: number }[]
                    const extOrder = order as typeof order & { order_text?: string | null; rejection_message?: string | null }

                    return (
                      <Card key={order.id} className={`border-t-2 ${color}`}>
                        <CardHeader className="p-3 pb-1.5">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <span className="font-bold text-sm">#{order.id.slice(-5).toUpperCase()}</span>
                              <p className="font-medium text-sm truncate">{order.customer_name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {TYPE_LABEL[order.order_type]}
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

                        <CardContent className="p-3 pt-0 space-y-2">
                          {/* Paquetes seleccionados */}
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

                          {/* Texto libre del pedido */}
                          {extOrder.order_text && (
                            <p className="text-xs bg-blue-50 text-blue-800 rounded px-2 py-1.5 leading-relaxed">
                              📝 {extOrder.order_text}
                            </p>
                          )}

                          {/* Mensaje de rechazo */}
                          {key === 'quote_rejected' && extOrder.rejection_message && (
                            <p className="text-xs bg-red-50 text-red-700 rounded px-2 py-1.5">
                              ❌ &ldquo;{extOrder.rejection_message}&rdquo;
                            </p>
                          )}

                          {/* Precio (cuando ya está cotizado) */}
                          {Number(order.total) > 0 && (
                            <p className="font-bold text-sm">{fmt(Number(order.total))}</p>
                          )}

                          {/* Acciones */}
                          <div className="flex gap-1">
                            {(key === 'received' || key === 'quote_rejected') && (
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                  setQuoteOrder(order)
                                  setQuoteSubtotal('')
                                  setQuoteDelivery('')
                                }}
                              >
                                <DollarSign size={11} className="mr-1" />
                                {key === 'quote_rejected' ? 'Nueva cotización' : 'Establecer precio'}
                              </Button>
                            )}
                            {key === 'accepted' && (
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={() => advanceStatus(order)}
                              >
                                Empezar <ChevronRight size={11} className="ml-1" />
                              </Button>
                            )}
                            {key === 'preparing' && (
                              <Button
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={() => advanceStatus(order)}
                              >
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

      {/* ── Modal cotización ─────────────────────────────── */}
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
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ej: 320"
                  value={quoteSubtotal}
                  onChange={(e) => setQuoteSubtotal(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Costo de envío ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ej: 40 (dejar en 0 si no aplica)"
                  value={quoteDelivery}
                  onChange={(e) => setQuoteDelivery(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      {/* ── Historial ─────────────────────────────────────── */}
      {view === 'history' && (
        <div>
          {!historyLoaded && (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
          )}
          {historyLoaded && history.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No hay pedidos finalizados aún</p>
          )}
          {historyLoaded && history.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 font-medium">Cliente</th>
                    <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                    <th className="text-left px-4 py-2.5 font-medium">Origen</th>
                    <th className="text-left px-4 py-2.5 font-medium">Total</th>
                    <th className="text-left px-4 py-2.5 font-medium">Estado</th>
                    <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        #{order.id.slice(-5).toUpperCase()}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{order.customer_name}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-xs">{TYPE_LABEL[order.order_type]}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="text-xs">
                          {order.source === 'pos' ? 'POS' : 'Online'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-semibold">{fmt(Number(order.total))}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={order.status === 'delivered' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {order.status === 'delivered' ? 'Terminado' : 'Cancelado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
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
