'use client'

import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { Download, Share, Plus, ChevronRight, UtensilsCrossed, CheckCircle2, Smartphone, Monitor } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

interface Props {
  slug: string
  restaurantName: string
  primaryColor: string
  logoUrl: string | null
}

export default function InstallClientPage({ slug, restaurantName, primaryColor, logoUrl }: Props) {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall()
  const [showInstructions, setShowInstructions] = useState(false)

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-3xl overflow-hidden shadow-lg border"
            style={{ backgroundColor: primaryColor }}>
            {logoUrl
              ? <img src={logoUrl} alt={restaurantName} className="h-full w-full object-cover" />
              : <UtensilsCrossed size={32} className="text-white" />}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-lg">¡App instalada!</span>
            </div>
            <p className="text-sm text-muted-foreground">Ya tienes la app de {restaurantName} en tu pantalla de inicio.</p>
          </div>
          <Link
            href={`/${slug}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-semibold text-base shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            Ver menú
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">

          {/* Branding */}
          <div className="text-center space-y-3">
            <div
              className="flex h-24 w-24 mx-auto items-center justify-center rounded-3xl overflow-hidden shadow-xl border-2 border-white"
              style={{ backgroundColor: primaryColor }}
            >
              {logoUrl
                ? <img src={logoUrl} alt={restaurantName} className="h-full w-full object-cover" />
                : <UtensilsCrossed size={40} className="text-white" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{restaurantName}</h1>
              <p className="text-sm text-muted-foreground mt-1">Pide rápido desde tu teléfono</p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: '⚡', label: 'Rápido' },
              { emoji: '📦', label: 'Rastrea tu pedido' },
              { emoji: '🔔', label: 'Sin apps' },
            ].map((f) => (
              <div key={f.label} className="bg-white rounded-2xl border p-3 text-center space-y-1 shadow-sm">
                <span className="text-2xl">{f.emoji}</span>
                <p className="text-xs font-medium text-slate-700">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Botón automático (si Chrome lo permite) */}
          {canInstall && (
            <button
              onClick={install}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg active:scale-95 transition-transform"
              style={{ backgroundColor: primaryColor }}
            >
              <Download size={20} />
              Instalar app
            </button>
          )}

          {/* Instrucciones manuales — siempre visibles si no hay prompt automático */}
          {!canInstall && !isIOS && (
            <div className="space-y-3">
              <div
                className="rounded-2xl border-2 p-4 space-y-3"
                style={{ borderColor: primaryColor + '40', backgroundColor: primaryColor + '08' }}
              >
                <div className="flex items-center gap-2">
                  <Smartphone size={16} style={{ color: primaryColor }} />
                  <p className="text-sm font-semibold text-slate-800">Instalar en Android (Chrome)</p>
                </div>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold mt-0.5" style={{ backgroundColor: primaryColor }}>1</span>
                    <span>Toca el menú <strong>⋮</strong> (tres puntos) arriba a la derecha</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold mt-0.5" style={{ backgroundColor: primaryColor }}>2</span>
                    <span>Selecciona <strong>"Añadir a pantalla de inicio"</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold mt-0.5" style={{ backgroundColor: primaryColor }}>3</span>
                    <span>Toca <strong>"Añadir"</strong> para confirmar</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full text-xs text-muted-foreground underline text-center"
              >
                {showInstructions ? 'Ocultar' : '¿Usas otro dispositivo?'}
              </button>

              {showInstructions && (
                <div className="rounded-2xl border p-4 space-y-3 bg-white">
                  <div className="flex items-center gap-2">
                    <Monitor size={15} className="text-slate-500" />
                    <p className="text-sm font-semibold text-slate-800">En computadora (Chrome)</p>
                  </div>
                  <p className="text-sm text-slate-600">
                    Busca el ícono <strong>⊕</strong> al final de la barra de dirección y haz clic en él.
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <Share size={15} className="text-slate-500" />
                    <p className="text-sm font-semibold text-slate-800">En iPhone (Safari)</p>
                  </div>
                  <ol className="space-y-1">
                    <li className="text-sm text-slate-600">1. Toca <Share size={12} className="inline" /> <strong>Compartir</strong></li>
                    <li className="text-sm text-slate-600">2. Selecciona <strong>"Añadir a pantalla de inicio"</strong> <Plus size={12} className="inline" /></li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* iOS */}
          {isIOS && (
            <div className="bg-white rounded-2xl border p-4 space-y-3 shadow-sm">
              <p className="text-sm font-semibold text-slate-800 text-center">Instalar en iPhone / iPad</p>
              <ol className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold mt-0.5">1</span>
                  <span>Toca <Share size={13} className="inline-block" /> <strong>Compartir</strong> en Safari</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold mt-0.5">2</span>
                  <span>Selecciona <strong>"Añadir a pantalla de inicio"</strong> <Plus size={13} className="inline-block" /></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold mt-0.5">3</span>
                  <span>Toca <strong>"Agregar"</strong></span>
                </li>
              </ol>
            </div>
          )}

          <Link
            href={`/${slug}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-slate-200 bg-white font-semibold text-slate-700 text-sm active:scale-95 transition-transform"
          >
            Continuar sin instalar
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="py-4 text-center">
        <Link href="/">
          <Image src="/turieats.png" alt="TuriEats" width={100} height={30} className="h-7 w-auto object-contain mx-auto opacity-60" />
        </Link>
      </div>
    </div>
  )
}
