'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChefHat, CheckCircle2 } from 'lucide-react'

interface KitchenItem {
  name: string
  quantity: number
  notes?: string
  status: 'pending' | 'done'
}

interface Ticket {
  id: string
  order_id: string
  status: string
  priority: number
  items: KitchenItem[]
  created_at: string
  orders: {
    customer_name: string
    order_type: string
    table_number?: string | null
    notes?: string | null
  } | null
}

const COLUMNS = [
  { key: 'queued',  label: 'En cola',    color: 'border-t-yellow-400', bg: 'bg-yellow-50' },
  { key: 'cooking', label: 'Cocinando',  color: 'border-t-orange-400', bg: 'bg-orange-50' },
]

interface Props {
  initialTickets: Ticket[]
  restaurantId: string
}

export default function KitchenBoard({ initialTickets, restaurantId }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const supabase = createClient()

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from('kitchen_tickets')
      .select('*, orders(customer_name, order_type, table_number, notes)')
      .eq('restaurant_id', restaurantId)
      .in('status', ['queued', 'cooking'])
      .order('created_at', { ascending: true })
    if (data) setTickets(data as unknown as Ticket[])
  }, [supabase, restaurantId])

  useEffect(() => {
    const channel = supabase
      .channel(`kitchen:${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kitchen_tickets',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => fetchTickets())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, supabase, fetchTickets])

  async function startCooking(ticket: Ticket) {
    await supabase.from('kitchen_tickets').update({ status: 'cooking' }).eq('id', ticket.id)
    toast.success('Cocinando...')
  }

  async function markDone(ticket: Ticket) {
    await supabase.from('kitchen_tickets').update({ status: 'done' }).eq('id', ticket.id)
    // El trigger sync_order_from_kitchen actualiza order.status a 'ready' automáticamente
    toast.success('¡Comanda lista! ✓')
  }

  async function toggleItem(ticket: Ticket, idx: number) {
    const updatedItems = ticket.items.map((item, i) =>
      i === idx ? { ...item, status: item.status === 'done' ? 'pending' : 'done' } : item
    )
    await supabase
      .from('kitchen_tickets')
      .update({ items: updatedItems })
      .eq('id', ticket.id)

    setTickets((prev) =>
      prev.map((t) => t.id === ticket.id ? { ...t, items: updatedItems as KitchenItem[] } : t)
    )
  }

  const allItemsDone = (ticket: Ticket) => ticket.items.every((i) => i.status === 'done')

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(({ key, label, color, bg }) => {
        const colTickets = tickets.filter((t) => t.status === key)

        return (
          <div key={key} className="flex-shrink-0 w-80">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-base">{label}</h3>
              {colTickets.length > 0 && (
                <Badge className={`${bg} text-gray-700 border-0`}>{colTickets.length}</Badge>
              )}
            </div>

            <div className="space-y-3">
              {colTickets.length === 0 && (
                <div className="border border-dashed rounded-lg p-6 text-center">
                  <ChefHat size={24} className="mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Sin comandas</p>
                </div>
              )}

              {colTickets.map((ticket) => {
                const order = ticket.orders
                const elapsed = formatDistanceToNow(new Date(ticket.created_at), { locale: es })
                const allDone = allItemsDone(ticket)

                return (
                  <Card key={ticket.id} className={`border-t-4 ${color}`}>
                    <CardHeader className="p-3 pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-base">{order?.customer_name}</p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {order?.order_type === 'dine_in' ? `Mesa ${order.table_number ?? '-'}` : order?.order_type === 'pickup' ? 'Llevar' : 'Delivery'}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{elapsed}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 pt-0">
                      {/* Items */}
                      <ul className="space-y-1.5 mb-3">
                        {ticket.items.map((item, i) => (
                          <li
                            key={i}
                            className={`flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-0.5 transition-colors ${
                              item.status === 'done' ? 'opacity-40 line-through' : 'hover:bg-muted/50'
                            }`}
                            onClick={() => toggleItem(ticket, i)}
                          >
                            <CheckCircle2
                              size={14}
                              className={item.status === 'done' ? 'text-green-500' : 'text-muted-foreground/30'}
                            />
                            <span className="font-medium">{item.quantity}x</span>
                            <span>{item.name}</span>
                            {item.notes && (
                              <span className="text-xs text-orange-600 ml-auto">({item.notes})</span>
                            )}
                          </li>
                        ))}
                      </ul>

                      {order?.notes && (
                        <p className="text-xs bg-yellow-50 text-yellow-800 rounded px-2 py-1 mb-3">
                          📝 {order.notes}
                        </p>
                      )}

                      {/* Acción */}
                      {key === 'queued' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs"
                          onClick={() => startCooking(ticket)}
                        >
                          🍳 Empezar a cocinar
                        </Button>
                      )}
                      {key === 'cooking' && (
                        <Button
                          size="sm"
                          className={`w-full h-8 text-xs ${allDone ? 'bg-green-600 hover:bg-green-700' : ''}`}
                          onClick={() => markDone(ticket)}
                          disabled={!allDone}
                        >
                          {allDone ? '✓ Marcar como lista' : `Faltan items por terminar`}
                        </Button>
                      )}
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
