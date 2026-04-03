'use client'

import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { Download, X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  variant?: 'light' | 'dark'
}

export default function InstallBanner({ variant = 'light' }: Props) {
  const { canInstall, isInstalled, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)

  // Solo mostrar si hay prompt automático disponible y no está instalada
  if (isInstalled || dismissed || !canInstall) return null

  const isDark = variant === 'dark'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 text-sm ${
      isDark
        ? 'bg-white/10 border-b border-white/10 text-white'
        : 'bg-orange-50 border-b border-orange-100 text-orange-900'
    }`}>
      <p className="flex-1 min-w-0 text-xs font-medium">
        Instala la app para acceso rápido desde tu pantalla de inicio
      </p>
      <button
        onClick={install}
        className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          isDark
            ? 'bg-white text-slate-900 hover:bg-slate-100'
            : 'bg-orange-500 text-white hover:bg-orange-600'
        }`}
      >
        <Download size={12} />
        Instalar
      </button>
      <button
        onClick={() => setDismissed(true)}
        className={`shrink-0 p-1 rounded transition-colors ${
          isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-orange-100 text-orange-400'
        }`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
