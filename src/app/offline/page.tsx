import Image from 'next/image'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-3">
          <div className="text-6xl">📡</div>
          <h1 className="text-xl font-bold text-slate-900">Sin conexión</h1>
          <p className="text-sm text-muted-foreground">
            Parece que no tienes conexión a internet. Revisa tu red e intenta de nuevo.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center w-full py-3.5 rounded-2xl bg-slate-900 text-white font-semibold text-sm"
        >
          Reintentar
        </Link>

        <Link href="/">
          <Image
            src="/turieats.png"
            alt="TuriEats"
            width={120}
            height={36}
            className="h-8 w-auto object-contain mx-auto opacity-50"
          />
        </Link>
      </div>
    </div>
  )
}
