'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent
  }
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled]     = useState(false)
  const [isIOS, setIsIOS]                 = useState(false)

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true)
    setIsInstalled(standalone)

    // Leer prompt capturado antes de hidratación
    if (window.__pwaInstallPrompt) {
      setInstallPrompt(window.__pwaInstallPrompt)
    }

    // Escuchar el evento custom que emitimos desde el inline script
    const onReady = () => {
      if (window.__pwaInstallPrompt) setInstallPrompt(window.__pwaInstallPrompt)
    }
    window.addEventListener('pwaInstallReady', onReady)

    // También escuchar el evento nativo por si llega después
    const onNative = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onNative)

    return () => {
      window.removeEventListener('pwaInstallReady', onReady)
      window.removeEventListener('beforeinstallprompt', onNative)
    }
  }, [])

  async function install(): Promise<boolean> {
    if (!installPrompt) return false
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      window.__pwaInstallPrompt = undefined
      setIsInstalled(true)
    }
    return outcome === 'accepted'
  }

  return { canInstall: !!installPrompt, isInstalled, isIOS, install }
}
