'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { isRestaurantOpen, formatCurrency } from '@/lib/utils/helpers'
import {
  MapPin, Truck, Clock, UtensilsCrossed, User, ChevronRight,
  Store, ShoppingCart, MessageSquare, ArrowRight, Sparkles, CheckCircle2,
} from 'lucide-react'
import ShareAppButton from '@/components/public/ShareAppButton'

/* ── types ──────────────────────────────────────────────────────── */
interface RestaurantHour {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

interface Business {
  id: string
  name: string
  slug: string
  logo_url: string | null
  header_image_url?: string | null
  primary_color: string
  address: string | null
  delivery_enabled: boolean
  delivery_fee: number
  business_type: 'restaurant' | 'store' | null
  timezone: string
  restaurant_hours: RestaurantHour[]
}

type TabType = 'all' | 'restaurant' | 'store'

interface Props {
  businesses: Business[]
  user: { id: string; email?: string } | null
}

/* ── helpers ─────────────────────────────────────────────────────── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, visible }
}

/* ── feature data ────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: UtensilsCrossed,
    color: 'bg-orange-500',
    title: 'Restaurantes',
    desc: 'Menú completo con precios fijos. Paga en línea o en efectivo.',
  },
  {
    icon: Store,
    color: 'bg-violet-500',
    title: 'Tiendas y negocios',
    desc: 'Pide abarrotes, frutas o lo que necesites. El negocio te cotiza.',
  },
  {
    icon: Truck,
    color: 'bg-sky-500',
    title: 'Delivery o recoge',
    desc: 'Elige entrega a domicilio o recoger en el lugar.',
  },
  {
    icon: MessageSquare,
    color: 'bg-emerald-500',
    title: 'Seguimiento en vivo',
    desc: 'Notificaciones en tiempo real del estado de tu pedido.',
  },
]

/* ── main component ──────────────────────────────────────────────── */
export default function LandingClient({ businesses, user }: Props) {
  const [tab, setTab] = useState<TabType>('all')
  const [mounted, setMounted] = useState(false)

  const featuresRef = useInView()
  const listingRef  = useInView(0.05)
  const ctaRef      = useInView()

  useEffect(() => { setMounted(true) }, [])

  const openCount       = businesses.filter(b => isRestaurantOpen(b.restaurant_hours ?? [], b.timezone)).length
  const restaurantCount = businesses.filter(b => b.business_type === 'restaurant').length
  const storeCount      = businesses.filter(b => b.business_type === 'store').length

  const filtered = tab === 'all' ? businesses
    : businesses.filter(b => b.business_type === tab)

  return (
    <div className="min-h-screen bg-[#f8f8f6] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-black/5 shadow-[0_1px_12px_rgba(0,0,0,.06)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Image
            src="/turieats.png" alt="TuriEats" width={130} height={40}
            className="h-9 w-auto object-contain" priority
          />
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <Link href="/cliente"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-full hover:bg-slate-100 transition-colors">
                <User size={15} />
                <span className="hidden sm:inline">Mi cuenta</span>
              </Link>
            ) : (
              <>
                <Link href="/cliente/login"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
                  Entrar
                </Link>
                <Link href="/cliente/login?modo=registro"
                  className="text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-700 active:scale-95 transition-all">
                  Registrarse
                </Link>
              </>
            )}
            <Link href="/auth/login"
              className="hidden sm:flex text-xs text-slate-400 hover:text-slate-600 transition-colors ml-1">
              ¿Tienes un negocio?
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 text-white">

        {/* animated background orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-orb-pulse absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-orange-600/20 blur-[80px]" />
          <div className="animate-orb-pulse absolute -bottom-24 -right-16 w-[360px] h-[360px] rounded-full bg-amber-500/15 blur-[70px]" style={{ animationDelay: '2s' }} />
          <div className="animate-orb-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-orange-500/10 blur-[60px]" style={{ animationDelay: '3.5s' }} />
        </div>

        {/* floating emoji elements */}
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <span className="animate-float-a absolute top-[12%] right-[8%] text-4xl sm:text-5xl opacity-20">🍔</span>
          <span className="animate-float-b absolute top-[55%] right-[15%] text-3xl opacity-15" style={{ animationDelay: '1s' }}>🛵</span>
          <span className="animate-float-c absolute top-[30%] left-[5%] text-3xl opacity-10" style={{ animationDelay: '2s' }}>🛒</span>
          <span className="animate-float-a absolute bottom-[15%] left-[12%] text-2xl opacity-10" style={{ animationDelay: '3s' }}>🍕</span>
        </div>

        <div className="relative max-w-6xl mx-auto px-5 py-14 sm:py-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">

          {/* left: copy */}
          <div className="flex-1">
            {openCount > 0 && mounted && (
              <div className="animate-fade-up delay-100 inline-flex items-center gap-2 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {openCount} {openCount === 1 ? 'negocio abierto' : 'negocios abiertos'} ahora
              </div>
            )}

            <h1 className={`text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight mb-4 ${mounted ? 'animate-fade-up delay-150' : 'opacity-0'}`}>
              Pide comida&nbsp;y{' '}
              <span className="shine-text">lo que&nbsp;necesites</span>
            </h1>

            <p className={`text-slate-400 text-base sm:text-lg max-w-[440px] leading-relaxed mb-7 ${mounted ? 'animate-fade-up delay-300' : 'opacity-0'}`}>
              Restaurantes con menú fijo y tiendas que cotizan. Todo en un solo lugar, directo a tu puerta.
            </p>

            <div className={`flex flex-wrap gap-3 ${mounted ? 'animate-fade-up delay-400' : 'opacity-0'}`}>
              {!user ? (
                <>
                  <Link href="/cliente/login?modo=registro"
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-xl shadow-orange-500/25 text-sm">
                    Empezar gratis <ArrowRight size={16} />
                  </Link>
                  <Link href="#negocios"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 active:scale-95 text-white font-semibold px-6 py-3 rounded-2xl transition-all border border-white/10 text-sm">
                    Ver negocios
                  </Link>
                </>
              ) : (
                <Link href="#negocios"
                  className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-xl shadow-orange-500/25 text-sm">
                  Ver negocios <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>

          {/* right: stats cards */}
          <div className={`flex gap-3 sm:flex-col ${mounted ? 'animate-scale-in delay-500' : 'opacity-0'}`}>
            {[
              { value: businesses.length, label: 'Negocios', sub: 'registrados' },
              { value: openCount, label: 'Abiertos', sub: 'ahora mismo', highlight: true },
            ].map(s => (
              <div key={s.label}
                className={`rounded-3xl px-5 py-4 min-w-[108px] text-center border backdrop-blur-sm ${
                  s.highlight
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-white/5 border-white/10'
                }`}>
                <p className={`text-3xl font-black ${s.highlight ? 'text-green-400' : 'text-white'}`}>{s.value}</p>
                <p className="text-sm font-semibold text-white/80 mt-0.5">{s.label}</p>
                <p className="text-[11px] text-white/40">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* bottom wave */}
        <div className="h-8 bg-[#f8f8f6]" style={{
          clipPath: 'ellipse(55% 100% at 50% 100%)',
          marginTop: '-1px',
        }} />
      </section>

      {/* ── Features strip ──────────────────────────────────────── */}
      <section
        ref={featuresRef.ref as React.RefObject<HTMLElement>}
        className="max-w-6xl mx-auto w-full px-5 pt-6 pb-2"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`bg-white rounded-2xl p-4 border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,.08)] transition-all hover:-translate-y-0.5 ${
                featuresRef.visible ? `animate-fade-up delay-${[100, 200, 300, 400][i]}` : 'opacity-0'
              }`}
            >
              <div className={`${f.color} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>
                <f.icon size={18} className="text-white" />
              </div>
              <p className="font-bold text-slate-900 text-sm leading-snug">{f.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Listing ──────────────────────────────────────────────── */}
      <main
        id="negocios"
        ref={listingRef.ref as React.RefObject<HTMLElement>}
        className="flex-1 max-w-6xl mx-auto w-full px-5 py-8"
      >
        {/* tabs */}
        <div className={`flex items-center gap-1 mb-6 bg-white rounded-2xl p-1.5 border border-black/5 shadow-sm w-full sm:w-auto sm:inline-flex ${listingRef.visible ? 'animate-fade-up' : 'opacity-0'}`}>
          {([
            { key: 'all',        label: 'Todo',         count: businesses.length },
            { key: 'restaurant', label: 'Restaurantes', count: restaurantCount },
            { key: 'store',      label: 'Tiendas',      count: storeCount },
          ] as { key: TabType; label: string; count: number }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab === t.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white border border-black/5">
              <UtensilsCrossed size={32} className="text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Pronto habrá negocios disponibles</p>
              <p className="text-sm text-slate-400 mt-1">Vuelve pronto para explorar</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((biz, i) => {
              const hours   = (biz.restaurant_hours ?? []) as Parameters<typeof isRestaurantOpen>[0]
              const isOpen  = isRestaurantOpen(hours, biz.timezone)
              const isStore = biz.business_type === 'store'
              const delayClass = `delay-${Math.min(i * 100, 700)}`

              return (
                <Link
                  key={biz.id}
                  href={`/${biz.slug}`}
                  className={`group flex flex-col bg-white rounded-3xl overflow-hidden border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,.12)] transition-all duration-300 hover:-translate-y-1 active:scale-[.98] ${
                    listingRef.visible ? `animate-scale-in ${delayClass}` : 'opacity-0'
                  }`}
                >
                  {/* cover */}
                  <div
                    className="relative h-40 w-full overflow-hidden"
                    style={{ backgroundColor: biz.primary_color + '20' }}
                  >
                    {biz.header_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={biz.header_image_url} alt=""
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center opacity-20">
                        {isStore
                          ? <Store size={52} style={{ color: biz.primary_color }} />
                          : <UtensilsCrossed size={52} style={{ color: biz.primary_color }} />
                        }
                      </div>
                    )}

                    {/* overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* open/closed badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md ${
                        isOpen ? 'bg-green-500/90 text-white' : 'bg-black/50 text-white/70'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
                        {isOpen ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>

                    {/* type badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md ${
                        isStore ? 'bg-violet-500/90 text-white' : 'bg-orange-500/90 text-white'
                      }`}>
                        {isStore ? <Store size={10} /> : <UtensilsCrossed size={10} />}
                        {isStore ? 'Tienda' : 'Restaurante'}
                      </span>
                    </div>

                    {/* logo */}
                    <div className="absolute bottom-3 left-4">
                      <div
                        className="h-12 w-12 rounded-2xl overflow-hidden border-2 border-white shadow-lg"
                        style={{ backgroundColor: biz.primary_color }}
                      >
                        {biz.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={biz.logo_url} alt={biz.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white text-xl font-black">
                            {biz.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* info */}
                  <div className="p-4 flex flex-col gap-2.5 flex-1">
                    <div>
                      <h3 className="font-bold text-slate-900 leading-snug group-hover:text-orange-600 transition-colors text-[15px]">
                        {biz.name}
                      </h3>
                      {biz.address && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={10} className="shrink-0" /> {biz.address}
                        </p>
                      )}
                    </div>

                    {/* chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {biz.delivery_enabled && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full">
                          <Truck size={10} />
                          Delivery {biz.delivery_fee > 0 ? formatCurrency(biz.delivery_fee) : '· Gratis'}
                        </span>
                      )}
                      {isStore ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                          <MessageSquare size={10} /> Cotización
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          <Clock size={10} /> Para llevar
                        </span>
                      )}
                    </div>

                    {/* cta */}
                    <div className="mt-auto flex items-center justify-between pt-2.5 border-t border-slate-50">
                      <span className="text-xs text-slate-400">
                        {isStore ? 'Hacer pedido' : 'Ver menú completo'}
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full text-white group-hover:opacity-90 transition-opacity shadow-sm"
                        style={{ backgroundColor: biz.primary_color }}
                      >
                        {isOpen ? (isStore ? 'Pedir' : 'Ordenar') : 'Ver'}{' '}
                        <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* ── How it works (tiendas explainer) ─────────────────────── */}
      <section
        ref={ctaRef.ref as React.RefObject<HTMLElement>}
        className="max-w-6xl mx-auto w-full px-5 py-8"
      >
        <div className={`bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white overflow-hidden relative ${ctaRef.visible ? 'animate-scale-in' : 'opacity-0'}`}>
          {/* bg orb */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative grid sm:grid-cols-2 gap-8 items-center">
            {/* left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
                <Sparkles size={12} /> ¿Cómo funciona?
              </div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight mb-4">
                Dos tipos de pedido,<br />
                <span className="shine-text">un solo lugar</span>
              </h2>
              <div className="space-y-3 text-sm text-slate-400">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-orange-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">Restaurantes:</strong> elige del menú, paga en línea o en efectivo, rastrea tu pedido.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-violet-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">Tiendas:</strong> escribe lo que necesitas o selecciona paquetes, el negocio te cotiza y tú decides si aceptas.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">Siempre:</strong> notificaciones en tiempo real para saber dónde está tu pedido.</span>
                </div>
              </div>
            </div>

            {/* right: for businesses */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Para negocios</p>
              <h3 className="text-xl font-black leading-snug mb-2">
                ¿Tienes un restaurante<br />o tienda?
              </h3>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Gestiona pedidos, menú, cocina y pagos desde un solo panel. Conecta Stripe y recibe pagos en línea.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20"
              >
                Registrar mi negocio <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-black/5 py-6 px-5 mt-4 bg-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-6xl mx-auto">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            © {new Date().getFullYear()} TuriEats · Todos los derechos reservados ·{' '}
            <Link href="/auth/login" className="hover:text-slate-600 transition-colors">
              ¿Tienes un negocio?
            </Link>
          </p>
          <ShareAppButton />
        </div>
      </footer>
    </div>
  )
}
