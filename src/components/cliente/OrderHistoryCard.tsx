'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/helpers'
import { ChevronDown, ChevronUp, MapPin, ChevronRight, Tag, UtensilsCrossed } from 'lucide-react'

type OrderItem = { name: string; quantity: number; unit_price: number; subtotal: number; notes?: string }
type DeliveryAddress = { street?: string; neighborhood?: string; city?: string; references?: string }

export type OrderCardData = {
  id: string
  order_type: string
  status: string
  items: OrderItem[]
  subtotal: number
  discount_amount: number
  delivery_fee: number
  total: number
  coupon_code: string | null
  notes: string | null
  created_at: string
  delivery_address: DeliveryAddress | null
  restaurants: { name: string; slug: string; primary_color: string; logo_url: string | null } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  received:   { label: 'Recibido',   color: 'bg-blue-50 text-blue-700 ring-blue-200',     dot: 'bg-blue-500' },
  accepted:   { label: 'Aceptado',   color: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500' },
  preparing:  { label: 'Preparando', color: 'bg-amber-50 text-amber-700 ring-amber-200',   dot: 'bg-amber-500' },
  ready:      { label: 'Listo',      color: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  on_the_way: { label: 'En camino',  color: 'bg-purple-50 text-purple-700 ring-purple-200', dot: 'bg-purple-500' },
  delivered:  { label: 'Entregado',  color: 'bg-green-50 text-green-700 ring-green-200',   dot: 'bg-green-500' },
  cancelled:  { label: 'Cancelado',  color: 'bg-red-50 text-red-700 ring-red-200',         dot: 'bg-red-400' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function OrderHistoryCard({ order }: { order: OrderCardData }) {
  const [expanded, setExpanded] = useState(false)
  const status     = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' }
  const restaurant = order.restaurants
  const items      = order.items as OrderItem[]
  const isActive   = !['delivered', 'cancelled'].includes(order.status)
  const itemCount  = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Color accent */}
      {restaurant && (
        <div className="h-1 w-full" style={{ backgroundColor: restaurant.primary_color }} />
      )}

      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Restaurant avatar */}
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-base font-bold"
            style={{ backgroundColor: restaurant?.primary_color ?? '#64748b' }}
          >
            {restaurant?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo_url} alt={restaurant.name} className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <UtensilsCrossed size={18} />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900 truncate">
                {restaurant?.name ?? 'Restaurante'}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'} ·{' '}
              <span className="capitalize">
                {order.order_type === 'delivery' ? 'Delivery' : order.order_type === 'pickup' ? 'Para recoger' : 'Mesa'}
              </span>
            </p>
          </div>

          {/* Total + expand */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="font-bold text-sm text-slate-900">{formatCurrency(order.total)}</span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-muted-foreground hover:text-slate-700 flex items-center gap-0.5 transition-colors"
            >
              Ver detalle
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Active order CTA */}
        {isActive && restaurant && (
          <Link
            href={`/${restaurant.slug}/order/${order.id}`}
            className="mt-3 flex items-center justify-between rounded-xl bg-orange-50 border border-orange-100 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Pedido en progreso · Toca para seguirlo
            </span>
            <ChevronRight size={13} />
          </Link>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t bg-slate-50 px-4 py-3 space-y-3">
          {/* Items */}
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-slate-700">
                  <span className="font-medium text-slate-900">{item.quantity}×</span> {item.name}
                  {item.notes && <span className="text-muted-foreground italic"> ({item.notes})</span>}
                </span>
                <span className="text-slate-600 shrink-0">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-2 space-y-1">
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-xs text-green-700">
                <span className="flex items-center gap-1"><Tag size={10} /> Descuento</span>
                <span>−{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            {order.coupon_code && (
              <div className="flex justify-between text-xs text-green-700">
                <span>Cupón: <code className="font-mono">{order.coupon_code}</code></span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Costo de envío</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-semibold text-slate-900 pt-1 border-t">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Delivery address */}
          {order.order_type === 'delivery' && order.delivery_address?.street && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1 border-t">
              <MapPin size={11} className="shrink-0 mt-0.5" />
              <span>
                {[order.delivery_address.street, order.delivery_address.neighborhood, order.delivery_address.city]
                  .filter(Boolean).join(', ')}
                {order.delivery_address.references && (
                  <span className="block italic">Ref: {order.delivery_address.references}</span>
                )}
              </span>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <p className="text-xs text-muted-foreground italic border-t pt-2">
              Nota: {order.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
