'use client'

import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { Download, Share, Plus, ChevronRight, CheckCircle2, Smartphone, Monitor, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function TuriEatsInstallPage() {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall()
  const [showMore, setShowMore] = useState(false)

  if (isInstalled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900">
        <div className="w-full max-w-sm space-y-6 text-center">
          <Image src="/turieats.png" alt="TuriEats" width={160} height={48} className="h-12 w-auto object-contain mx-auto" />
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-lg text-white">¡App instalada!</span>
            </div>
            <p className="text-sm text-slate-400">Ya tienes TuriEats en tu pantalla de inicio.</p>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-lg"
          >
            Ver restaurantes
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
          <div className="text-center space-y-4">
            <div className="flex h-24 w-24 mx-auto items-center justify-center rounded-3xl bg-orange-500 shadow-2xl shadow-orange-500/30">
              <UtensilsCrossed size={44} className="text-white" />
            </div>
            <div>
              <Image src="/turieats.png" alt="TuriEats" width={160} height={48} className="h-10 w-auto object-contain mx-auto" />
              <p className="text-slate-400 mt-2 text-sm">Pide en tus restaurantes favoritos</p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: '🍔', label: 'Todos los restaurantes' },
              { emoji: '📦', label: 'Rastrea tu pedido' },
              { emoji: '💳', label: 'Paga en línea' },
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
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
            >
              <Download size={20} />
              Instalar TuriEats
            </button>
          )}

          {/* Instrucciones manuales Android */}
          {!canInstall && !isIOS && (
            <div className="space-y-3">
              <div className="bg-white/10 rounded-2xl border border-white/15 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone size={15} className="text-orange-400" />
                  <p className="text-sm font-semibold text-white">Instalar en Android (Chrome)</p>
                </div>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold mt-0.5">1</span>
                    <span>Toca el menú <strong className="text-white">⋮</strong> (tres puntos) arriba a la derecha</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold mt-0.5">2</span>
                    <span>Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold mt-0.5">3</span>
                    <span>Toca <strong className="text-white">"Añadir"</strong> para confirmar</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setShowMore(!showMore)}
                className="w-full text-xs text-slate-500 underline text-center"
              >
                {showMore ? 'Ocultar' : '¿Usas iPhone o computadora?'}
              </button>

              {showMore && (
                <div className="bg-white/10 rounded-2xl border border-white/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Monitor size={15} className="text-slate-400" />
                    <p className="text-sm font-semibold text-white">En computadora (Chrome)</p>
                  </div>
                  <p className="text-sm text-slate-300">
                    Busca el ícono <strong className="text-white">⊕</strong> al final de la barra de dirección y haz clic.
                  </p>

                  <div className="border-t border-white/10 pt-3 flex items-center gap-2">
                    <Share size={15} className="text-slate-400" />
                    <p className="text-sm font-semibold text-white">En iPhone (Safari)</p>
                  </div>
                  <ol className="space-y-1.5 text-sm text-slate-300">
                    <li>1. Toca <Share size={12} className="inline" /> <strong className="text-white">Compartir</strong></li>
                    <li>2. Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong> <Plus size={12} className="inline" /></li>
                    <li>3. Toca <strong className="text-white">"Agregar"</strong></li>
                  </ol>
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
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold mt-0.5">1</span>
                  <span>Toca <Share size={13} className="inline-block" /> <strong className="text-white">Compartir</strong> en Safari</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold mt-0.5">2</span>
                  <span>Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong> <Plus size={13} className="inline-block" /></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold mt-0.5">3</span>
                  <span>Toca <strong className="text-white">"Agregar"</strong></span>
                </li>
              </ol>
            </div>
          )}

          {/* CTAs secundarios */}
          <div className="space-y-2">
            <Link
              href="/cliente/login"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-white/20 font-semibold text-white text-sm active:scale-95 transition-transform"
            >
              Iniciar sesión
              <ChevronRight size={16} />
            </Link>
            <Link
              href="/"
              className="block text-center text-xs text-slate-500 hover:text-slate-400 py-2"
            >
              Explorar sin cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
