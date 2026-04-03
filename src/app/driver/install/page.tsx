'use client'

import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { ChevronRight, Bike, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import InstallButton from '@/components/shared/InstallButton'

export default function DriverInstallPage() {
  const { isInstalled } = usePWAInstall()

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
          <Link href="/driver" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-base shadow-lg">
            Entrar al portal <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
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
              <p className="text-slate-400 mt-1 text-sm">Recibe y gestiona tus entregas</p>
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

          {/* Botón — siempre visible, blanco sobre fondo oscuro */}
          <div className="[&_button]:bg-white [&_button]:text-slate-900 [&_div]:text-white [&_div]:border-white/20 [&_div]:bg-white/5">
            <InstallButton label="Instalar portal" />
          </div>

          <Link href="/driver/login" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-white/20 font-semibold text-white text-sm">
            Continuar sin instalar <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="py-4 text-center">
        <Image src="/turieats.png" alt="TuriEats" width={100} height={30} className="h-7 w-auto object-contain mx-auto opacity-30" />
      </div>
    </div>
  )
}
