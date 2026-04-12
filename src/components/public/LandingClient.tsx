'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { isRestaurantOpen, formatCurrency } from '@/lib/utils/helpers'
import {
  MapPin, Truck, Clock, UtensilsCrossed, User, ChevronRight,
  Store, MessageSquare, ArrowRight, Sparkles, CheckCircle2, ChevronDown,
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

type BizType = 'restaurant' | 'store'

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
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

/* ── component ───────────────────────────────────────────────────── */
export default function LandingClient({ businesses, user }: Props) {
  const [selected, setSelected] = useState<BizType | null>(null)
  const [mounted, setMounted]   = useState(false)
  const gridRef  = useRef<HTMLElement | null>(null)
  const heroRef  = useInView(0.05)
  const ctaRef   = useInView()

  useEffect(() => { setMounted(true) }, [])

  const openCount = businesses.filter(
    b => isRestaurantOpen(b.restaurant_hours ?? [], b.timezone)
  ).length

  // filtrar por tipo y ordenar: abiertos primero, cerrados al final
  const displayed = selected
    ? [...businesses.filter(b => b.business_type === selected)].sort((a, b) => {
        const aOpen = isRestaurantOpen(a.restaurant_hours ?? [], a.timezone) ? 1 : 0
        const bOpen = isRestaurantOpen(b.restaurant_hours ?? [], b.timezone) ? 1 : 0
        return bOpen - aOpen
      })
    : []

  function handleSelect(type: BizType) {
    setSelected(type)
    // pequeño delay para que el grid aparezca antes del scroll
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-black/5 shadow-[0_1px_12px_rgba(0,0,0,.06)]">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Image src="/turieats.png" alt="TuriEats" width={130} height={40}
            className="h-9 w-auto object-contain" priority />
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
              className="hidden sm:block text-xs text-slate-400 hover:text-slate-600 transition-colors ml-1">
              ¿Tienes un negocio?
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        ref={heroRef.ref as React.RefObject<HTMLElement>}
        className="relative overflow-hidden bg-slate-950 text-white"
      >
        {/* orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-orb-pulse absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-orange-600/20 blur-[80px]" />
          <div className="animate-orb-pulse absolute -bottom-20 -right-10 w-[360px] h-[360px] rounded-full bg-amber-500/15 blur-[70px]" style={{ animationDelay: '2s' }} />
        </div>

        {/* emojis flotantes */}
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <span className="animate-float-a absolute top-[10%] right-[7%] text-4xl opacity-[0.15]">🍔</span>
          <span className="animate-float-b absolute top-[60%] right-[18%] text-3xl opacity-[0.12]" style={{ animationDelay: '1s' }}>🛵</span>
          <span className="animate-float-c absolute top-[35%] left-[4%] text-3xl opacity-[0.10]" style={{ animationDelay: '2s' }}>🛒</span>
          <span className="animate-float-a absolute bottom-[12%] left-[14%] text-2xl opacity-[0.10]" style={{ animationDelay: '3s' }}>🍕</span>
        </div>

        <div className="relative max-w-6xl mx-auto px-5 pt-12 pb-8 sm:pt-16 sm:pb-10 text-center sm:text-left">

          {/* badge abiertos */}
          {openCount > 0 && mounted && (
            <div className="animate-fade-up delay-100 inline-flex items-center gap-2 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {openCount} {openCount === 1 ? 'negocio abierto' : 'negocios abiertos'} ahora
            </div>
          )}

          <h1 className={`text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight mb-4 ${mounted ? 'animate-fade-up delay-150' : 'opacity-0'}`}>
            Pide lo que quieras,{' '}
            <span className="shine-text">cuando quieras</span>
          </h1>
          <p className={`text-slate-400 text-base sm:text-lg max-w-[440px] mx-auto sm:mx-0 leading-relaxed mb-8 ${mounted ? 'animate-fade-up delay-300' : 'opacity-0'}`}>
            Restaurantes con menú fijo o tiendas que cotizan tu pedido. Tú eliges.
          </p>

          {/* flecha hacia abajo */}
          <div className={`flex justify-center sm:justify-start ${mounted ? 'animate-fade-up delay-500' : 'opacity-0'}`}>
            <ChevronDown size={22} className="text-white/30 animate-float-c" />
          </div>
        </div>

        {/* wave bottom */}
        <div className="h-8 bg-[#f8f8f6]" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)', marginTop: '-1px' }} />
      </section>

      {/* ── Selector de tipo ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-5 pt-4 pb-6">
        <p className={`text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mb-5 ${mounted ? 'animate-fade-up delay-100' : 'opacity-0'}`}>
          ¿Qué tipo de pedido quieres hacer?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* --- Restaurante --- */}
          <button
            onClick={() => handleSelect('restaurant')}
            className={`group relative overflow-hidden rounded-3xl p-6 sm:p-8 text-left border-2 transition-all duration-300 active:scale-[.98] ${
              selected === 'restaurant'
                ? 'border-orange-500 bg-orange-50 shadow-xl shadow-orange-500/15'
                : selected === 'store'
                  ? 'border-transparent bg-white opacity-50 shadow-sm'
                  : 'border-transparent bg-white hover:border-orange-300 hover:shadow-lg shadow-sm'
            }`}
          >
            {/* bg decorativo */}
            <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-orange-100 group-hover:bg-orange-200 transition-colors" />
            {/* check si seleccionado */}
            {selected === 'restaurant' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center animate-scale-in">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            )}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mb-5 shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
                <UtensilsCrossed size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Restaurante</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Menú con precios fijos. Elige tus platillos y paga en línea o en efectivo al recibir.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                  <UtensilsCrossed size={9} /> Menú fijo
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
                  💳 Pago inmediato
                </span>
              </div>
            </div>
          </button>

          {/* --- Tienda --- */}
          <button
            onClick={() => handleSelect('store')}
            className={`group relative overflow-hidden rounded-3xl p-6 sm:p-8 text-left border-2 transition-all duration-300 active:scale-[.98] ${
              selected === 'store'
                ? 'border-violet-500 bg-violet-50 shadow-xl shadow-violet-500/15'
                : selected === 'restaurant'
                  ? 'border-transparent bg-white opacity-50 shadow-sm'
                  : 'border-transparent bg-white hover:border-violet-300 hover:shadow-lg shadow-sm'
            }`}
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-36 h-36 rounded-full bg-violet-100 group-hover:bg-violet-200 transition-colors" />
            {selected === 'store' && (
              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center animate-scale-in">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            )}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-violet-500 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform">
                <Store size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Tienda / Negocio</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Pide abarrotes, frutas o lo que necesites en texto libre. El negocio te cotiza el precio.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                  <MessageSquare size={9} /> Pedido libre
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                  💰 Te cotizan
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* hint para cambiar selección */}
        {selected && (
          <p className="text-center text-xs text-slate-400 mt-4 animate-fade-in">
            Toca la otra opción para cambiar
          </p>
        )}
      </section>

      {/* ── Grid de negocios ────────────────────────────────────────── */}
      {selected && (
        <main
          id="negocios"
          ref={gridRef as React.RefObject<HTMLElement>}
          className="flex-1 max-w-6xl mx-auto w-full px-5 pb-10"
        >
          {/* header del listado */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-slate-900 animate-fade-up">
                {selected === 'restaurant' ? 'Restaurantes' : 'Tiendas y negocios'}
              </h2>
              <p className="text-xs text-slate-400 animate-fade-up delay-100">
                {displayed.filter(b => isRestaurantOpen(b.restaurant_hours ?? [], b.timezone)).length} abiertos ·{' '}
                {displayed.filter(b => !isRestaurantOpen(b.restaurant_hours ?? [], b.timezone)).length} cerrados
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-full hover:bg-white border border-transparent hover:border-black/5"
            >
              Cambiar tipo
            </button>
          </div>

          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white border border-black/5">
                {selected === 'restaurant'
                  ? <UtensilsCrossed size={32} className="text-slate-300" />
                  : <Store size={32} className="text-slate-300" />
                }
              </div>
              <div>
                <p className="font-semibold text-slate-700">
                  No hay {selected === 'restaurant' ? 'restaurantes' : 'tiendas'} disponibles
                </p>
                <p className="text-sm text-slate-400 mt-1">Vuelve pronto para explorar</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayed.map((biz, i) => {
                const hours  = (biz.restaurant_hours ?? []) as Parameters<typeof isRestaurantOpen>[0]
                const isOpen = isRestaurantOpen(hours, biz.timezone)
                const accentColor = selected === 'restaurant' ? 'orange' : 'violet'

                return (
                  <Link
                    key={biz.id}
                    href={`/${biz.slug}`}
                    className={[
                      'group flex flex-col rounded-3xl overflow-hidden border transition-all duration-300',
                      // base
                      isOpen
                        ? 'bg-white border-black/5 shadow-[0_2px_12px_rgba(0,0,0,.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,.12)] hover:-translate-y-1 active:scale-[.98]'
                        : 'bg-slate-100 border-slate-200/80 shadow-none cursor-default pointer-events-none',
                      // animación de entrada escalonada
                      `animate-scale-in`,
                    ].join(' ')}
                    style={{ animationDelay: `${Math.min(i * 80, 500)}ms` }}
                    // links cerrados aún navegan (el storefront muestra "cerrado")
                    {...(!isOpen ? { onClick: (e) => e.preventDefault() } : {})}
                  >
                    {/* ── cover ── */}
                    <div className="relative h-40 w-full overflow-hidden bg-slate-200">

                      {/* imagen / placeholder */}
                      {biz.header_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={biz.header_image_url} alt=""
                          className={[
                            'h-full w-full object-cover transition-transform duration-700 ease-out',
                            isOpen ? 'group-hover:scale-105' : 'grayscale',
                          ].join(' ')}
                        />
                      ) : (
                        <div
                          className="h-full w-full flex items-center justify-center"
                          style={{ backgroundColor: isOpen ? biz.primary_color + '20' : '#e2e8f0' }}
                        >
                          {selected === 'restaurant'
                            ? <UtensilsCrossed size={52} style={{ color: isOpen ? biz.primary_color : '#94a3b8', opacity: 0.25 }} />
                            : <Store size={52} style={{ color: isOpen ? biz.primary_color : '#94a3b8', opacity: 0.25 }} />
                          }
                        </div>
                      )}

                      {/* overlay */}
                      <div className={[
                        'absolute inset-0 bg-gradient-to-t',
                        isOpen ? 'from-black/45 via-transparent to-transparent' : 'from-black/20 via-slate-400/10 to-transparent',
                      ].join(' ')} />

                      {/* badge abierto/cerrado */}
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md ${
                          isOpen ? 'bg-green-500/90 text-white' : 'bg-slate-600/70 text-white/70'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
                          {isOpen ? 'Abierto' : 'Cerrado'}
                        </span>
                      </div>

                      {/* logo */}
                      <div className="absolute bottom-3 left-4">
                        <div
                          className={`h-12 w-12 rounded-2xl overflow-hidden border-2 shadow-lg ${isOpen ? 'border-white' : 'border-slate-300 grayscale'}`}
                          style={{ backgroundColor: isOpen ? biz.primary_color : '#94a3b8' }}
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

                    {/* ── info ── */}
                    <div className={`p-4 flex flex-col gap-2.5 flex-1 ${isOpen ? '' : 'opacity-60'}`}>
                      <div>
                        <h3 className={`font-bold leading-snug text-[15px] transition-colors ${
                          isOpen ? 'text-slate-900 group-hover:text-' + accentColor + '-600' : 'text-slate-500'
                        }`}>
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
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isOpen ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <Truck size={10} />
                            Delivery {biz.delivery_fee > 0 ? formatCurrency(biz.delivery_fee) : '· Gratis'}
                          </span>
                        )}
                        {selected === 'store' ? (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isOpen ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <MessageSquare size={10} /> Cotización
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isOpen ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <Clock size={10} /> Para llevar
                          </span>
                        )}
                      </div>

                      {/* cta */}
                      <div className="mt-auto flex items-center justify-between pt-2.5 border-t border-slate-100">
                        <span className="text-xs text-slate-400">
                          {isOpen
                            ? selected === 'store' ? 'Hacer pedido' : 'Ver menú completo'
                            : 'Fuera de horario'
                          }
                        </span>
                        {isOpen && (
                          <span
                            className="flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full text-white shadow-sm"
                            style={{ backgroundColor: biz.primary_color }}
                          >
                            {selected === 'store' ? 'Pedir' : 'Ordenar'}
                            <ChevronRight size={12} />
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </main>
      )}

      {/* ── CTA negocios ────────────────────────────────────────────── */}
      <section
        ref={ctaRef.ref as React.RefObject<HTMLElement>}
        className="max-w-6xl mx-auto w-full px-5 py-8"
      >
        <div className={`bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white overflow-hidden relative ${ctaRef.visible ? 'animate-scale-in' : 'opacity-0'}`}>
          <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative grid sm:grid-cols-2 gap-8 items-center">
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
                  <span><strong className="text-white">Tiendas:</strong> escribe lo que necesitas, el negocio te cotiza y tú decides si aceptas o negocias.</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">Siempre:</strong> notificaciones en tiempo real mientras tu pedido avanza.</span>
                </div>
              </div>
            </div>

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

      {/* ── Footer ──────────────────────────────────────────────────── */}
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
