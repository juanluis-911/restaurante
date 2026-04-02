'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, Receipt, ExternalLink, Loader2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { Database } from '@/types/database'

type BillingPeriod = Database['public']['Tables']['billing_periods']['Row']
type Restaurant    = Database['public']['Tables']['restaurants']['Row']

interface Props {
  restaurant: Restaurant
}

export default function BillingCard({ restaurant }: Props) {
  const [periods,  setPeriods]  = useState<BillingPeriod[]>([])
  const [loading,  setLoading]  = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('billing_periods')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('week_start', { ascending: false })
        .limit(8)
      setPeriods(data ?? [])
      setLoading(false)
    }
    load()
  }, [restaurant.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingPeriod = periods.find((p) => ['invoiced', 'overdue'].includes(p.status))
  const isSuspended   = restaurant.billing_status === 'suspended'

  const currentWeekPeriod = periods.find((p) => p.status === 'open')
  const currentWeekOrders = currentWeekPeriod?.order_count ?? 0
  const projectedAmount   = Math.max(currentWeekOrders * 5, 100)

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short',
    })
  }

  function statusLabel(status: string) {
    const map: Record<string, { label: string; className: string }> = {
      open:     { label: 'Semana actual',  className: 'text-blue-600 border-blue-200 bg-blue-50' },
      invoiced: { label: 'Pendiente',      className: 'text-amber-600 border-amber-200 bg-amber-50' },
      paid:     { label: 'Pagado',         className: 'text-green-600 border-green-200 bg-green-50' },
      overdue:  { label: 'Vencido',        className: 'text-red-600 border-red-200 bg-red-50' },
    }
    return map[status] ?? { label: status, className: '' }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt size={18} />
          Facturación de plataforma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Alerta de suspensión */}
        {isSuspended && pendingPeriod && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Restaurante suspendido</p>
                <p className="text-sm text-red-600 mt-0.5">
                  Tienes una deuda pendiente de{' '}
                  <strong>${Number(pendingPeriod.amount_owed).toFixed(2)} MXN</strong>{' '}
                  por la semana del {formatDate(pendingPeriod.week_start)} al {formatDate(pendingPeriod.week_end)}.
                  Paga para reactivar tu restaurante.
                </p>
              </div>
            </div>
            <a
              href={pendingPeriod.stripe_payment_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: 'sm' }), 'w-full gap-1.5')}
            >
              <ExternalLink size={14} />
              Pagar ${Number(pendingPeriod.amount_owed).toFixed(2)} MXN ahora
            </a>
          </div>
        )}

        {/* Estado activo + proyección semana actual */}
        {!isSuspended && (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600" />
              <span className="text-sm font-medium">Cuenta activa</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta semana: <strong>{currentWeekOrders} pedido(s)</strong> →
              proyección de <strong>${projectedAmount} MXN</strong>
              {currentWeekOrders < 20 && (
                <span className="text-xs ml-1">(mínimo semanal: $100 MXN)</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              La factura se genera cada lunes a las 2am. Se cobra $5 MXN por pedido con un mínimo de $100 MXN/semana.
            </p>
          </div>
        )}

        {/* Historial */}
        <div>
          <p className="text-sm font-medium mb-2">Historial reciente</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 size={14} className="animate-spin" />
              Cargando...
            </div>
          ) : periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros todavía.</p>
          ) : (
            <div className="space-y-2">
              {periods.map((p) => {
                const { label, className } = statusLabel(p.status)
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {formatDate(p.week_start)} – {formatDate(p.week_end)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.order_count} pedido(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        ${Number(p.amount_owed).toFixed(0)} MXN
                      </span>
                      <Badge variant="outline" className={`text-xs ${className}`}>
                        {label}
                      </Badge>
                      {p.stripe_payment_url && ['invoiced', 'overdue'].includes(p.status) && (
                        <a
                          href={p.stripe_payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
