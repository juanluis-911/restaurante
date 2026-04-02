'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CreditCard, CheckCircle2, AlertCircle, ExternalLink, Unlink } from 'lucide-react'
import type { Database } from '@/types/database'

type Restaurant = Database['public']['Tables']['restaurants']['Row']

interface Props {
  restaurant: Restaurant
}

export default function StripeConnectCard({ restaurant }: Props) {
  const [disconnecting, setDisconnecting] = useState(false)
  const supabase = createClient()

  const isConnected = restaurant.stripe_account_status === 'active' && !!restaurant.stripe_account_id

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/stripe/connect/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Cuenta Stripe desconectada')
      // Recargar para reflejar el cambio
      window.location.reload()
    } catch {
      toast.error('Error al desconectar la cuenta')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard size={18} />
          Pagos con Stripe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Conecta tu cuenta Stripe para recibir pagos de tus clientes directamente en tu cuenta bancaria.
        </p>

        <div className="flex items-center gap-3">
          {isConnected ? (
            <Badge variant="outline" className="gap-1.5 text-green-600 border-green-200 bg-green-50">
              <CheckCircle2 size={13} />
              Conectado
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-200 bg-amber-50">
              <AlertCircle size={13} />
              No conectado
            </Badge>
          )}
          {restaurant.stripe_account_id && (
            <span className="text-xs text-muted-foreground font-mono">
              {restaurant.stripe_account_id}
            </span>
          )}
        </div>

        {isConnected ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1.5"
              >
                <ExternalLink size={14} />
                Ver dashboard Stripe
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              <Unlink size={14} />
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </Button>
          </div>
        ) : (
          <Button asChild size="sm" className="gap-1.5">
            <a href="/api/stripe/connect/authorize">
              <CreditCard size={14} />
              Conectar cuenta Stripe
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
