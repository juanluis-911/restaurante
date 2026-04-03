'use client'

import { useRef } from 'react'
import QRCode from 'react-qr-code'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, Download, QrCode, Bike, UtensilsCrossed } from 'lucide-react'

interface Props {
  slug: string
}

function QRPanel({
  title,
  description,
  url,
  icon,
  color,
}: {
  title: string
  description: string
  url: string
  icon: React.ReactNode
  color: string
}) {
  const qrRef = useRef<HTMLDivElement>(null)

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    toast.success('Enlace copiado')
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    const img = new window.Image()
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
    const objectUrl = URL.createObjectURL(blob)

    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 20, 20, size - 40, size - 40)
      URL.revokeObjectURL(objectUrl)

      const a = document.createElement('a')
      a.download = `qr-${title.toLowerCase().replace(/\s+/g, '-')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = objectUrl
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 rounded-xl border bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-2 self-start">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: color }}>
          <span className="text-white">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* QR */}
      <div ref={qrRef} className="bg-white p-3 rounded-xl border shadow-sm">
        <QRCode value={url} size={160} level="M" />
      </div>

      {/* URL */}
      <div className="w-full px-2 py-1.5 bg-white rounded-lg border text-xs font-mono text-muted-foreground break-all text-center">
        {url}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 w-full">
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={copyLink}>
          <Copy size={13} />
          Copiar enlace
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={downloadQR}>
          <Download size={13} />
          Descargar QR
        </Button>
      </div>
    </div>
  )
}

export default function QRShareCard({ slug }: Props) {
  const siteUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const clientUrl = `${siteUrl}/${slug}/install`
  const driverUrl = `${siteUrl}/driver/install`

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode size={16} />
          <CardTitle className="text-base">Códigos QR para compartir</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Comparte estos QR para que clientes y repartidores descarguen la app.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <QRPanel
            title="QR Clientes"
            description="Para que los clientes pidan"
            url={clientUrl}
            icon={<UtensilsCrossed size={14} />}
            color="#f97316"
          />
          <QRPanel
            title="QR Repartidores"
            description="Para el equipo de entregas"
            url={driverUrl}
            icon={<Bike size={14} />}
            color="#0f172a"
          />
        </div>
      </CardContent>
    </Card>
  )
}
