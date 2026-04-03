import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { isRestaurantOpen, formatCurrency } from '@/lib/utils/helpers'
import { MapPin, Truck, Clock, UtensilsCrossed, User, ChevronRight, Star, Zap } from 'lucide-react'
import { redirect } from 'next/navigation'
import InstallBanner from '@/components/shared/InstallBanner'
import ShareAppButton from '@/components/public/ShareAppButton'

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

  // ── Restaurantes (todos los usuarios) ───────────────────────────
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*, restaurant_hours(*)')
    .eq('is_active', true)
    .order('created_at')

  const openCount = restaurants?.filter((r) => isRestaurantOpen(r.restaurant_hours ?? [], r.timezone)).length ?? 0

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Install Banner ── */}
      <InstallBanner />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Image src="/turieats.png" alt="TuriEats" width={130} height={40} className="h-9 w-auto object-contain" priority />
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/cliente"
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <User size={15} />
                Mi cuenta
              </Link>
            ) : (
              <>
                <Link href="/cliente/login"
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 px-4 py-2 rounded-full hover:bg-slate-100 transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/cliente/login?modo=registro"
                  className="text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-700 transition-colors">
                  Crear cuenta
                </Link>
              </>
            )}
            <Link href="/auth/login"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors hidden sm:block ml-2">
              ¿Tienes un restaurante?
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="bg-slate-950 text-white px-5 py-10 sm:py-14">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight">
              {user ? <>¿Qué vas a{' '}</> : <>Tu comida favorita,{' '}</>}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
                {user ? 'pedir hoy?' : 'a un toque.'}
              </span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              {openCount > 0
                ? <><span className="text-green-400 font-semibold">{openCount} restaurante{openCount !== 1 ? 's' : ''} abierto{openCount !== 1 ? 's' : ''}</span> ahora mismo</>
                : 'Explora los restaurantes disponibles'}
            </p>
            {!user && (
              <div className="flex items-center gap-3 mt-4">
                <Link href="/cliente/login?modo=registro"
                  className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-lg shadow-orange-500/20">
                  Crear cuenta gratis <ChevronRight size={15} />
                </Link>
                <Link href="/cliente/login"
                  className="text-sm text-slate-400 hover:text-white transition-colors">
                  Ya tengo cuenta
                </Link>
              </div>
            )}
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

      <footer className="border-t py-6 px-5 mt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-6xl mx-auto">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} TuriEats · Todos los derechos reservados ·{' '}
            <Link href="/auth/login" className="hover:text-slate-600 transition-colors">¿Tienes un restaurante?</Link>
          </p>
          <ShareAppButton />
        </div>
      </footer>
    </div>
  )
}
