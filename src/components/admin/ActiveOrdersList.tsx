'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Order = Database['public']['Tables']['orders']['Row']

const STATUS_LABELS: Record<string, string> = {
  received:   'Recibido',
  accepted:   'Aceptado',
  preparing:  'En preparación',
  ready:      'Listo',
  on_the_way: 'En camino',
}

const STATUS_COLORS: Record<string, string> = {
  received:   'bg-yellow-100 text-yellow-800',
  accepted:   'bg-blue-100 text-blue-800',
  preparing:  'bg-orange-100 text-orange-800',
  ready:      'bg-green-100 text-green-800',
  on_the_way: 'bg-purple-100 text-purple-800',
}

interface Props {
  initialOrders: Order[]
  restaurantId: string
}

export default function ActiveOrdersList({ initialOrders, restaurantId }: Props) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('status', ['received', 'accepted', 'preparing', 'ready', 'on_the_way'])
      .order('created_at', { ascending: true })

    if (data) setOrders(data)
  }, [supabase, restaurantId])

  useEffect(() => {
    // Suscripción Realtime a pedidos de este restaurante
    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => fetchOrders()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId, supabase, fetchOrders])

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-sm">No hay pedidos activos en este momento</p>
          <Button variant="outline" className="mt-3" size="sm">
            <Link href="/dashboard/orders">Ver todos los pedidos</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.slice(0, 6).map((order) => {
        const items = order.items as { name: string; quantity: number }[]
        const summary = items.slice(0, 2).map((i) => `${i.quantity}x ${i.name}`).join(', ')
        const more = items.length > 2 ? ` +${items.length - 2} más` : ''

        return (
          <Card key={order.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_COLORS[order.status] ?? ''
                      }`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {order.order_type === 'dine_in' ? 'Mesa' : order.order_type === 'pickup' ? 'Para llevar' : 'Delivery'}
                    </Badge>
                    {order.stripe_session_id && (
                      <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
                        💳 Pagado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {order.customer_name} · {summary}{more}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(order.total))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {orders.length > 6 && (
        <Button variant="outline" className="w-full" size="sm">
          <Link href="/dashboard/orders">Ver todos ({orders.length} activos)</Link>
        </Button>
      )}
    </div>
  )
}
