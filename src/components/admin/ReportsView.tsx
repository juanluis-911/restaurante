'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Order {
  id: string
  total: number
  status: string
  created_at: string
  order_type: string
  source: string
  discount_amount: number
  items: { name: string; quantity: number }[]
}

interface Transaction {
  payment_method: string
  amount: number
}

interface Props {
  orders: Order[]
  transactions: Transaction[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export default function ReportsView({ orders, transactions }: Props) {
  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + Number(o.total), 0), [orders])
  const totalDiscount = useMemo(() => orders.reduce((s, o) => s + Number(o.discount_amount), 0), [orders])
  const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0

  // Ventas por día
  const byDay = useMemo(() => {
    const map: Record<string, number> = {}
    orders.forEach((o) => {
      const day = format(new Date(o.created_at), 'dd MMM', { locale: es })
      map[day] = (map[day] ?? 0) + Number(o.total)
    })
    return Object.entries(map).map(([date, total]) => ({ date, total: Math.round(total) }))
  }, [orders])

  // Productos más vendidos
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {}
    orders.forEach((o) => {
      const items = o.items as { name: string; quantity: number; unit_price?: number }[]
      items.forEach((item) => {
        if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, revenue: 0 }
        map[item.name].qty += item.quantity
        map[item.name].revenue += item.quantity * (item.unit_price ?? 0)
      })
    })
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8)
  }, [orders])

  // Por tipo de pedido
  const byType: Record<string, number> = { dine_in: 0, pickup: 0, delivery: 0 }
  orders.forEach((o) => { byType[o.order_type] = (byType[o.order_type] ?? 0) + 1 })

  // Por método de pago
  const byPayment: Record<string, number> = {}
  transactions.forEach((t) => {
    byPayment[t.payment_method] = (byPayment[t.payment_method] ?? 0) + Number(t.amount)
  })

  const TYPE_LABEL: Record<string, string> = { dine_in: 'Mesa', pickup: 'Para llevar', delivery: 'Delivery' }
  const PAY_LABEL: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos totales', value: fmt(totalRevenue) },
          { label: 'Pedidos', value: orders.length.toString() },
          { label: 'Ticket promedio', value: fmt(avgTicket) },
          { label: 'Total descontado', value: fmt(totalDiscount) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-semibold mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfica de ventas por día */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ventas por día</CardTitle></CardHeader>
        <CardContent>
          {byDay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDay} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={55} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Productos más vendidos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Productos más vendidos</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p) => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="truncate mr-3">{p.name}</span>
                    <div className="flex gap-3 shrink-0 text-muted-foreground">
                      <span>{p.qty} uds</span>
                      <span>{fmt(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desglose */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Por tipo de pedido</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span>{TYPE_LABEL[type]}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Por método de pago (POS)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(byPayment).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin transacciones POS</p>
              ) : (
                Object.entries(byPayment).map(([method, amount]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span>{PAY_LABEL[method] ?? method}</span>
                    <span className="font-medium">{fmt(amount)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
