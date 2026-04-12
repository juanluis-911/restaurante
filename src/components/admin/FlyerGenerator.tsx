'use client'

import { useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Megaphone } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  slug: string
  restaurantName: string
  logoUrl: string | null
  primaryColor: string
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 249, g: 115, b: 22 }
}

function darkenColor(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function FlyerGenerator({ slug, restaurantName, logoUrl, primaryColor }: Props) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  const siteUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const clientUrl = `${siteUrl}/${slug}/install`

  function getQRImage(): Promise<HTMLImageElement> {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return Promise.reject(new Error('No QR SVG found'))
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: 'image/svg+xml',
    })
    const objectUrl = URL.createObjectURL(blob)
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img) }
      img.onerror = reject
      img.src = objectUrl
    })
  }

  async function downloadFlyer() {
    setGenerating(true)
    try {
      const S = 1080
      const canvas = document.createElement('canvas')
      canvas.width = S
      canvas.height = S
      const ctx = canvas.getContext('2d')!

      // ── Background gradient ──────────────────────────────
      const grad = ctx.createLinearGradient(0, 0, S, S)
      grad.addColorStop(0, primaryColor)
      grad.addColorStop(1, darkenColor(primaryColor, 80))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, S, S)

      // Subtle dot pattern overlay
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      for (let i = 0; i < S; i += 44) {
        for (let j = 0; j < S; j += 44) {
          ctx.beginPath()
          ctx.arc(i, j, 4, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ── White card ───────────────────────────────────────
      const pad = 72
      ctx.fillStyle = 'rgba(255,255,255,0.97)'
      roundedRect(ctx, pad, pad, S - pad * 2, S - pad * 2, 36)
      ctx.fill()

      const cx = S / 2
      let y = pad + 56

      // ── Restaurant logo ──────────────────────────────────
      let logoLoaded = false
      if (logoUrl) {
        try {
          const logo = await loadImage(logoUrl)
          const ls = 130
          ctx.save()
          ctx.beginPath()
          ctx.arc(cx, y + ls / 2, ls / 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(logo, cx - ls / 2, y, ls, ls)
          ctx.restore()
          // border ring
          ctx.strokeStyle = primaryColor
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.arc(cx, y + ls / 2, ls / 2 + 2, 0, Math.PI * 2)
          ctx.stroke()
          y += ls + 24
          logoLoaded = true
        } catch {
          // logo CORS-blocked — skip silently
        }
      }

      if (!logoLoaded) {
        // Initials circle fallback
        const ls = 110
        ctx.fillStyle = primaryColor
        ctx.beginPath()
        ctx.arc(cx, y + ls / 2, ls / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = `bold 52px Inter, Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(restaurantName.charAt(0).toUpperCase(), cx, y + ls / 2)
        ctx.textBaseline = 'alphabetic'
        y += ls + 24
      }

      // ── Restaurant name ──────────────────────────────────
      ctx.fillStyle = '#111827'
      ctx.font = `bold 54px Inter, Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(restaurantName, cx, y)
      y += 52

      // ── Tagline ──────────────────────────────────────────
      ctx.fillStyle = primaryColor
      ctx.font = `bold 34px Inter, Arial, sans-serif`
      ctx.fillText('¡Ahora pedidos en línea!', cx, y)
      y += 38

      ctx.fillStyle = '#6b7280'
      ctx.font = `24px Inter, Arial, sans-serif`
      ctx.fillText('Escanea el QR y ordena desde tu teléfono', cx, y)
      y += 44

      // ── QR code ──────────────────────────────────────────
      const qrImg = await getQRImage()
      const qs = 260
      const qx = cx - qs / 2

      // QR card background
      ctx.fillStyle = '#ffffff'
      roundedRect(ctx, qx - 20, y - 10, qs + 40, qs + 40, 20)
      ctx.fill()
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.drawImage(qrImg, qx, y, qs, qs)
      y += qs + 36

      // ── URL pill ─────────────────────────────────────────
      const urlText = clientUrl
      ctx.font = `18px monospace`
      const urlW = ctx.measureText(urlText).width + 40
      ctx.fillStyle = '#f3f4f6'
      roundedRect(ctx, cx - urlW / 2, y - 26, urlW, 36, 18)
      ctx.fill()
      ctx.fillStyle = '#6b7280'
      ctx.fillText(urlText, cx, y)
      y += 48

      // ── TuriEats logo ────────────────────────────────────
      try {
        const turiLogo = await loadImage('/turieats.png')
        const th = 44
        const tw = (turiLogo.naturalWidth / turiLogo.naturalHeight) * th
        ctx.drawImage(turiLogo, cx - tw / 2, y, tw, th)
        y += th + 18
      } catch {
        ctx.fillStyle = primaryColor
        ctx.font = `bold 30px Inter, Arial, sans-serif`
        ctx.fillText('TuriEats', cx, y + 30)
        y += 50
      }

      // ── Bottom CTA strip ─────────────────────────────────
      ctx.fillStyle = primaryColor
      roundedRect(ctx, pad + 20, y, S - pad * 2 - 40, 52, 26)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold 22px Inter, Arial, sans-serif`
      ctx.fillText('Descarga la app gratis en turieats.com', cx, y + 35)

      // ── Download ─────────────────────────────────────────
      const a = document.createElement('a')
      a.download = `flyer-${slug}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()

      toast.success('Flyer descargado')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar el flyer')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone size={16} />
          <CardTitle className="text-base">Flyer publicitario</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Genera un flyer listo para publicar en Facebook e Instagram con tu QR de pedidos.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Preview */}
        <div
          className="relative mx-auto rounded-2xl overflow-hidden aspect-square max-w-xs border shadow-lg select-none"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${darkenColor(primaryColor, 60)})`,
          }}
        >
          {/* Dot pattern */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          />

          <div className="absolute inset-5 bg-white/95 rounded-xl flex flex-col items-center justify-between py-4 px-3 gap-2">

            {/* Logo */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-14 h-14 rounded-full object-cover border-2"
                style={{ borderColor: primaryColor }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                style={{ backgroundColor: primaryColor }}
              >
                {restaurantName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Name + tagline */}
            <div className="text-center space-y-0.5">
              <p className="font-bold text-gray-900 text-sm leading-tight">{restaurantName}</p>
              <p className="font-semibold text-xs" style={{ color: primaryColor }}>
                ¡Ahora pedidos en línea!
              </p>
              <p className="text-gray-400 text-[10px]">Escanea el QR y ordena</p>
            </div>

            {/* QR (hidden clone used for canvas export) */}
            <div ref={qrRef} className="bg-white p-2 rounded-xl border shadow-sm">
              <QRCode value={clientUrl} size={90} level="M" />
            </div>

            {/* URL */}
            <p className="text-[9px] text-gray-400 font-mono text-center truncate w-full px-1">
              {clientUrl}
            </p>

            {/* TuriEats logo */}
            <img src="/turieats.png" alt="TuriEats" className="h-4 object-contain" />

            {/* CTA strip */}
            <div
              className="w-full py-1.5 rounded-full text-white text-[10px] font-semibold text-center"
              style={{ backgroundColor: primaryColor }}
            >
              Descarga la app en turieats.com
            </div>
          </div>
        </div>

        <Button
          type="button"
          className="w-full gap-2"
          onClick={downloadFlyer}
          disabled={generating}
        >
          <Download size={15} />
          {generating ? 'Generando flyer…' : 'Descargar flyer (1080 × 1080 px)'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Formato cuadrado ideal para Facebook e Instagram.
        </p>
      </CardContent>
    </Card>
  )
}
