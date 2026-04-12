'use client'

import { usePWAInstall } from '@/lib/hooks/usePWAInstall'
import { Download, Share, Plus, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface Props {
  label?: string
  className?: string
  style?: React.CSSProperties
  onInstalled?: () => void
}

export default function InstallButton({ label = 'Instalar app', className = '', style, onInstalled }: Props) {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall()
  const [showSteps, setShowSteps] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (isInstalled) return null

  async function handleClick() {
    if (canInstall) {
      setInstalling(true)
      const ok = await install()
      setInstalling(false)
      if (ok) onInstalled?.()
    } else {
      setShowSteps((s) => !s)
    }
  }

  return (
    <div className="w-full space-y-3">
      <button
        onClick={handleClick}
        disabled={installing}
        style={style}
        className={`flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-transform disabled:opacity-70 ${className}`}
      >
        {installing ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Instalando...
          </>
        ) : (
          <>
            <Download size={20} />
            {label}
            {!canInstall && <ChevronDown size={16} className={`transition-transform ${showSteps ? 'rotate-180' : ''}`} />}
          </>
        )}
      </button>

      {/* Instrucciones — solo aparecen al hacer clic si no hay prompt automático */}
      {showSteps && !canInstall && (
        <div className="rounded-2xl border border-current/20 bg-current/5 p-4 space-y-3 text-sm">
          {isIOS ? (
            <>
              <p className="font-semibold">Instalar en iPhone / iPad:</p>
              <ol className="space-y-1.5 list-none">
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0">1.</span>
                  <span>Toca <Share size={13} className="inline" /> <strong>Compartir</strong> en Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0">2.</span>
                  <span>Selecciona <strong>"Añadir a pantalla de inicio"</strong> <Plus size={13} className="inline" /></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0">3.</span>
                  <span>Toca <strong>"Agregar"</strong></span>
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-semibold">Instalar en Chrome (Android / PC):</p>
              <ol className="space-y-1.5 list-none">
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0">1.</span>
                  <span>Toca el menú <strong>⋮</strong> (tres puntos) en la esquina superior derecha</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0">2.</span>
                  <span>Selecciona <strong>"Añadir a pantalla de inicio"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold shrink-0">3.</span>
                  <span>Toca <strong>"Añadir"</strong> para confirmar</span>
                </li>
              </ol>
              <p className="text-xs opacity-70 pt-1 border-t border-current/10">
                En PC: busca el ícono <strong>⊕</strong> al final de la barra de dirección.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
