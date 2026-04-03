import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { isRestaurantOpen, formatCurrency } from '@/lib/utils/helpers'
import { MapPin, Truck, Clock, UtensilsCrossed, User, ChevronRight, Star, Zap } from 'lucide-react'
import { redirect } from 'next/navigation'

export const revalidate = 60

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirigir dueños y repartidores
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'restaurant_owner') {
      const { data: restaurants } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).limit(1)
      redirect(restaurants?.length ? '/dashboard' : '/auth/onboarding')
    }
    if (profile?.role === 'driver') redirect('/driver')
  }

  // ── Vista guest ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
            <Image src="/turieats.png" alt="TuriEats" width={130} height={40} className="h-9 w-auto object-contain" priority />
            <div className="flex items-center gap-1">
              <Link href="/cliente/login"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
                Iniciar sesión
              </Link>
              <Link href="/cliente/login?modo=registro"
                className="text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-700 transition-colors">
                Crear cuenta
              </Link>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-slate-950 flex-1 flex items-center">
          {/* Fondo decorativo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-2xl" />
            {/* Grid pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative max-w-5xl mx-auto px-5 py-24 sm:py-32 flex flex-col items-center text-center gap-8">

            {/* Chip */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/70 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              Pedidos en línea · Rápido y sin llamadas
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight max-w-3xl">
              Tu comida favorita,{' '}
              <span className="relative">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">
                  a un toque.
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-3 bg-orange-500/20 blur-sm rounded-full" />
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-lg sm:text-xl text-slate-400 max-w-xl leading-relaxed">
              Explora los mejores restaurantes de tu ciudad, personaliza tu pedido y recíbelo sin complicaciones.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <Link href="/cliente/login?modo=registro"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors text-base shadow-lg shadow-orange-500/20">
                Pedir ahora gratis
                <ChevronRight size={18} />
              </Link>
              <Link href="/cliente/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium px-8 py-4 rounded-2xl transition-colors text-base backdrop-blur-sm">
                Ya tengo cuenta
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 text-sm text-slate-500 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {['🧑', '👩', '👨'].map((e, i) => (
                    <div key={i} className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-xs">{e}</div>
                  ))}
                </div>
                <span>+500 clientes satisfechos</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} size={13} className="fill-amber-400 text-amber-400" />)}
                <span className="ml-1">4.9/5</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section className="bg-slate-50 py-20 px-5">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-3">Así de fácil</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Tu pedido en 3 pasos</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: '01', icon: '🍽️', title: 'Elige tu restaurante', desc: 'Explora el menú con fotos, precios y descripción de cada platillo.' },
                { step: '02', icon: '🛒', title: 'Arma tu pedido', desc: 'Agrega lo que quieras al carrito. Aplica cupones o descuentos automáticos.' },
                { step: '03', icon: '🚀', title: 'Recibe y disfruta', desc: 'Sigue el estado de tu pedido en tiempo real hasta que llegue a tus manos.' },
              ].map((item) => (
                <div key={item.step} className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{item.icon}</span>
                    <span className="text-5xl font-black text-slate-100">{item.step}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20 px-5 bg-white">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { icon: <Zap size={20} className="text-amber-500" />, title: 'Seguimiento en tiempo real', desc: 'Mira cada etapa de tu pedido: recibido, en preparación, en camino y entregado.' },
              { icon: <Truck size={20} className="text-blue-500" />, title: 'Delivery o para llevar', desc: 'Elige entre domicilio, recoger en tienda o pedir a tu mesa.' },
              { icon: <Star size={20} className="text-orange-500" />, title: 'Historial y direcciones', desc: 'Tus pedidos anteriores y direcciones guardadas, siempre a mano.' },
              { icon: <UtensilsCrossed size={20} className="text-green-500" />, title: 'Menús visuales', desc: 'Fotos, descripciones y precios claros. Combos y descuentos automáticos.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl border bg-slate-50 hover:bg-white hover:shadow-sm transition-all">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border shadow-sm">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-0.5">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="bg-gradient-to-br from-orange-500 to-rose-500 py-20 px-5">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              ¿Listo para tu primer pedido?
            </h2>
            <p className="text-white/80 text-lg">Crea tu cuenta gratis en segundos y empieza a pedir.</p>
            <Link href="/cliente/login?modo=registro"
              className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 transition-colors text-base shadow-lg">
              Crear cuenta gratis
              <ChevronRight size={18} />
            </Link>
            <p className="text-white/50 text-sm">Sin tarjeta. Sin compromisos.</p>
          </div>
        </section>

        {/* ── ¿Tienes un restaurante? ── */}
        <section className="bg-slate-950 py-12 px-5">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
            <div>
              <p className="text-white font-semibold text-lg">¿Tienes un restaurante?</p>
              <p className="text-slate-400 text-sm mt-0.5">Recibe pedidos en línea y gestiona todo desde un solo panel.</p>
            </div>
            <Link href="/auth/login"
              className="shrink-0 inline-flex items-center gap-2 border border-white/20 text-white hover:bg-white/10 font-medium px-6 py-3 rounded-xl transition-colors text-sm">
              Registra tu restaurante
              <ChevronRight size={15} />
            </Link>
          </div>
        </section>

        <footer className="bg-slate-950 border-t border-white/5 py-6 px-5 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} TuriEats · Todos los derechos reservados
        </footer>
      </div>
    )
  }

  // ── Vista autenticada: listado de restaurantes ───────────────────
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*, restaurant_hours(*)')
    .eq('is_active', true)
    .order('created_at')

  const openCount   = restaurants?.filter((r) => isRestaurantOpen(r.restaurant_hours ?? [], r.timezone)).length ?? 0

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Image src="/turieats.png" alt="TuriEats" width={130} height={40} className="h-9 w-auto object-contain" priority />
          <div className="flex items-center gap-2">
            <Link href="/cliente"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
              <User size={15} />
              Mi cuenta
            </Link>
            <Link href="/auth/login"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors hidden sm:block">
              ¿Tienes un restaurante?
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero compacto ── */}
      <section className="bg-slate-950 text-white px-5 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              ¿Qué vas a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
                pedir hoy?
              </span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              {openCount > 0
                ? <><span className="text-green-400 font-semibold">{openCount} restaurante{openCount !== 1 ? 's' : ''} abierto{openCount !== 1 ? 's' : ''}</span> ahora mismo</>
                : 'Explora los restaurantes disponibles'}
            </p>
          </div>
          <div className="flex gap-3 text-center">
            {[
              { value: restaurants?.length ?? 0, label: 'Restaurantes' },
              { value: openCount, label: 'Abiertos ahora', green: true },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 min-w-[90px]">
                <p className={`text-2xl font-black ${stat.green ? 'text-green-400' : 'text-white'}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grid restaurantes ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-5 py-8">
        {!restaurants?.length ? (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100">
              <UtensilsCrossed size={32} className="text-slate-300" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Pronto habrá restaurantes disponibles</p>
              <p className="text-sm text-muted-foreground mt-1">Vuelve pronto para explorar el menú</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {restaurants.map((restaurant) => {
              const hours      = (restaurant.restaurant_hours ?? []) as Parameters<typeof isRestaurantOpen>[0]
              const isOpen     = isRestaurantOpen(hours, restaurant.timezone)
              const headerImg  = (restaurant as { header_image_url?: string | null }).header_image_url

              return (
                <Link
                  key={restaurant.id}
                  href={`/${restaurant.slug}`}
                  className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-slate-100"
                >
                  {/* Cover image */}
                  <div className="relative h-36 w-full overflow-hidden bg-slate-100" style={!headerImg ? { backgroundColor: restaurant.primary_color + '20' } : {}}>
                    {headerImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={headerImg} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center opacity-20">
                        <UtensilsCrossed size={48} style={{ color: restaurant.primary_color }} />
                      </div>
                    )}
                    {/* Gradiente inferior */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                    {/* Badge abierto/cerrado */}
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                        isOpen ? 'bg-green-500/90 text-white' : 'bg-black/40 text-white/70'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
                        {isOpen ? 'Abierto' : 'Cerrado'}
                      </span>
                    </div>

                    {/* Logo superpuesto */}
                    <div className="absolute bottom-3 left-3">
                      <div className="h-12 w-12 rounded-xl overflow-hidden border-2 border-white shadow-md bg-white"
                        style={{ backgroundColor: restaurant.primary_color }}>
                        {restaurant.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={restaurant.logo_url} alt={restaurant.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-white text-xl font-black">
                            {restaurant.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <h3 className="font-bold text-slate-900 leading-snug group-hover:text-orange-600 transition-colors">
                        {restaurant.name}
                      </h3>
                      {restaurant.address && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={10} className="shrink-0" /> {restaurant.address}
                        </p>
                      )}
                    </div>

                    {/* Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {restaurant.delivery_enabled && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          <Truck size={10} />
                          Delivery {restaurant.delivery_fee > 0 ? formatCurrency(restaurant.delivery_fee) : '· Gratis'}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        <Clock size={10} /> Para llevar
                      </span>
                    </div>

                    {/* CTA */}
                    <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-50">
                      <span className="text-xs text-slate-400">Ver menú completo</span>
                      <span
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full text-white transition-opacity group-hover:opacity-80"
                        style={{ backgroundColor: restaurant.primary_color }}
                      >
                        Ordenar <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <footer className="border-t py-6 px-5 text-center text-xs text-slate-400 mt-4">
        © {new Date().getFullYear()} TuriEats · Todos los derechos reservados ·{' '}
        <Link href="/auth/login" className="hover:text-slate-600 transition-colors">¿Tienes un restaurante?</Link>
      </footer>
    </div>
  )
}
