import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, ShoppingBag, Clock, TrendingUp } from 'lucide-react'

interface Props {
  totalRevenue: number
  totalOrders: number
  pendingOrders: number
  avgTicket: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export default function DashboardStats({ totalRevenue, totalOrders, pendingOrders, avgTicket }: Props) {
  const stats = [
    {
      label: 'Ingresos hoy',
      value: fmt(totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pedidos hoy',
      value: totalOrders.toString(),
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Pendientes',
      value: pendingOrders.toString(),
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Ticket promedio',
      value: fmt(avgTicket),
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{label}</p>
              <div className={`rounded-md p-1.5 ${bg}`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <p className="text-xl font-semibold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
