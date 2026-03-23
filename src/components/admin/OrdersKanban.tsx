'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronRight, X } from 'lucide-react'
import type { Database } from '@/types/database'

type Order = Database['public']['Tables']['orders']['Row']
type OrderStatus = Order['status']

const COLUMNS: { key: OrderStatus; label: string; color: string }[] = [
  { key: 'received',   label: 'Recibidos',      color: 'border-t-yellow-400' },
  { key: 'accepted',   label: 'Aceptados',      color: 'border-t-blue-400' },
  { key: 'preparing',  label: 'En preparación', color: 'border-t-orange-400' },
  { key: 'ready',      label: 'Listos',          color: 'border-t-green-400' },
  { key: 'on_the_way', label: 'En camino',       color: 'border-t-purple-400' },
]

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  received:   'accepted',
  accepted:   'preparing',
  preparing:  'ready',
  ready:      'on_the_way',
  on_the_way: 'delivered',
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  received:   'Aceptar',
  accepted:   'A cocina',
  preparing:  'Listo',
  ready:      'En camino',
  on_the_way: 'Entregado',
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in:  'Mesa',
  pickup:   'Llevar',
  delivery: 'Delivery',
}

interface Props {
  initialOrders: Order[]
  restaurantId: string
}

export default function OrdersKanban({ initialOrders, restaurantId }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at', { ascending: true })
    if (data) setOrders(data)
  }, [supabase, restaurantId])

  useEffect(() => {
    const channel = supabase
      .channel(`kanban:${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => fetchOrders())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, supabase, fetchOrders])

  async function advanceStatus(order: Order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return

    const { error } = await supabase
      .from('orders')
      .update({ status: next })
      .eq('id', order.id)

    if (error) {
      toast.error('No se pudo actualizar el pedido')
    } else {
      toast.success(next === 'delivered' ? 'Pedido entregado ✓' : 'Estado actualizado')
    }
  }

  async function cancelOrder(order: Order) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)

    if (error) toast.error('No se pudo cancelar')
    else toast.warning('Pedido cancelado')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map(({ key, label, color }) => {
        const colOrders = orders.filter((o) => o.status === key)

        return (
          <div key={key} className="flex-shrink-0 w-72">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">{label}</h3>
              {colOrders.length > 0 && (
                <Badge variant="secondary" className="text-xs">{colOrders.length}</Badge>
              )}
            </div>

            <div className="space-y-2">
              {colOrders.length === 0 && (
                <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                  Sin pedidos
                </div>
              )}

              {colOrders.map((order) => {
                const items = order.items as { name: string; quantity: number }[]

                return (
                  <Card key={order.id} className={`border-t-2 ${color}`}>
                    <CardHeader className="p-3 pb-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {ORDER_TYPE_LABEL[order.order_type]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {order.source === 'pos' ? 'POS' : 'Online'}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </CardHeader>

                    <CardContent className="p-3 pt-1">
                      {/* Items */}
                      <ul className="text-xs text-muted-foreground space-y-0.5 mb-2">
                        {items.map((item, i) => (
                          <li key={i}>{item.quantity}x {item.name}</li>
                        ))}
                      </ul>

                      {order.notes && (
                        <p className="text-xs bg-yellow-50 text-yellow-800 rounded px-2 py-1 mb-2">
                          📝 {order.notes}
                        </p>
                      )}

                      {order.table_number && (
                        <p className="text-xs text-muted-foreground mb-2">Mesa: {order.table_number}</p>
                      )}

                      {/* Total */}
                      <p className="font-semibold text-sm mb-2">{fmt(Number(order.total))}</p>

                      {/* Acciones */}
                      <div className="flex gap-1.5">
                        {NEXT_STATUS[order.status] && (
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => advanceStatus(order)}
                          >
                            {NEXT_LABEL[order.status]}
                            <ChevronRight size={12} className="ml-1" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
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
  )
}
