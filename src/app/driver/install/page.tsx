'use client'

import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { Download, Share, Plus, ChevronRight, Bike, CheckCircle2, Smartphone, Monitor } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function DriverInstallPage() {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall()
  const [showMore, setShowMore] = useState(false)

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-3xl bg-white/10">
            <Bike size={36} className="text-white" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-lg text-white">¡App instalada!</span>
            </div>
            <p className="text-sm text-slate-400">Ya tienes el portal de repartidores en tu pantalla de inicio.</p>
          </div>
          <Link
            href="/driver"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-base shadow-lg"
          >
            Entrar al portal
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">

          {/* Branding */}
          <div className="text-center space-y-3">
            <div className="flex h-24 w-24 mx-auto items-center justify-center rounded-3xl bg-white/10 shadow-xl border border-white/20">
              <Bike size={44} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">TuriEats</p>
              <h1 className="text-2xl font-bold text-white">Portal Repartidores</h1>
              <p className="text-sm text-slate-400 mt-1">Recibe y gestiona tus entregas</p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: '📦', label: 'Pedidos en tiempo real' },
              { emoji: '📍', label: 'Dirección de entrega' },
              { emoji: '✅', label: 'Confirma entregas' },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-2xl border border-white/10 p-3 text-center space-y-1">
                <span className="text-2xl">{f.emoji}</span>
                <p className="text-xs font-medium text-slate-300">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Botón automático si Chrome lo permite */}
          {canInstall && (
            <button
              onClick={install}
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-white text-slate-900 font-bold text-base shadow-lg active:scale-95 transition-transform"
            >
              <Download size={20} />
              Instalar app
            </button>
          )}

          {/* Instrucciones manuales Android */}
          {!canInstall && !isIOS && (
            <div className="space-y-3">
              <div className="bg-white/10 rounded-2xl border border-white/15 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={15} className="text-white" />
                  <p className="text-sm font-semibold text-white">Instalar en Android (Chrome)</p>
                </div>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-xs font-bold mt-0.5">1</span>
                    <span>Toca el menú <strong className="text-white">⋮</strong> (tres puntos) arriba a la derecha</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-xs font-bold mt-0.5">2</span>
                    <span>Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-xs font-bold mt-0.5">3</span>
                    <span>Toca <strong className="text-white">"Añadir"</strong> para confirmar</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setShowMore(!showMore)}
                className="w-full text-xs text-slate-500 underline text-center"
              >
                {showMore ? 'Ocultar' : '¿Usas otro dispositivo?'}
              </button>

              {showMore && (
                <div className="bg-white/10 rounded-2xl border border-white/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Monitor size={15} className="text-slate-400" />
                    <p className="text-sm font-semibold text-white">En computadora (Chrome)</p>
                  </div>
                  <p className="text-sm text-slate-300">
                    Busca el ícono <strong className="text-white">⊕</strong> al final de la barra de dirección.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Share size={15} className="text-slate-400" />
                    <p className="text-sm font-semibold text-white">En iPhone (Safari)</p>
                  </div>
                  <p className="text-sm text-slate-300">
                    Toca <Share size={12} className="inline" /> <strong className="text-white">Compartir</strong> → <strong className="text-white">"Añadir a pantalla de inicio"</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* iOS */}
          {isIOS && (
            <div className="bg-white/10 rounded-2xl border border-white/10 p-4 space-y-3">
              <p className="text-sm font-semibold text-white text-center">Instalar en iPhone / iPad</p>
              <ol className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-xs font-bold mt-0.5">1</span>
                  <span>Toca <Share size={13} className="inline-block" /> <strong className="text-white">Compartir</strong> en Safari</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-xs font-bold mt-0.5">2</span>
                  <span>Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong> <Plus size={13} className="inline-block" /></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 text-xs font-bold mt-0.5">3</span>
                  <span>Toca <strong className="text-white">"Agregar"</strong></span>
                </li>
              </ol>
            </div>
          )}

          <Link
            href="/driver/login"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-white/20 font-semibold text-white text-sm active:scale-95 transition-transform"
          >
            Continuar sin instalar
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="py-4 text-center">
        <Image src="/turieats.png" alt="TuriEats" width={100} height={30} className="h-7 w-auto object-contain mx-auto opacity-30" />
      </div>
    </div>
  )
}
