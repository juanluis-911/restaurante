'use client'

import { Share2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ShareAppButton() {
  async function handleShare() {
    const shareData = {
      title: 'TuriEats',
      text: 'Pide en tus restaurantes favoritos desde tu celular',
      url: `${window.location.origin}/install`,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // Usuario canceló, ignorar
      }
    } else {
      await navigator.clipboard.writeText(shareData.url)
      toast.success('Enlace copiado al portapapeles')
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-100"
    >
      <Share2 size={13} />
      Compartir app
    </button>
  )
}
