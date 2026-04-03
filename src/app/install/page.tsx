'use client'

import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { ChevronRight, UtensilsCrossed, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import InstallButton from '@/components/shared/InstallButton'

export default function TuriEatsInstallPage() {
  const { isInstalled } = usePWAInstall()

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
          <Link href="/" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-orange-500 text-white font-bold text-base shadow-lg">
            Ver restaurantes <ChevronRight size={18} />
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

          {/* Botón — siempre visible */}
          <InstallButton
            label="Instalar TuriEats"
            className="bg-orange-500 text-white shadow-lg shadow-orange-500/30"
          />

          {/* CTAs secundarios */}
          <div className="space-y-2">
            <Link href="/cliente/login" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-white/20 font-semibold text-white text-sm">
              Iniciar sesión <ChevronRight size={16} />
            </Link>
            <Link href="/" className="block text-center text-xs text-slate-500 hover:text-slate-400 py-2">
              Explorar sin cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
