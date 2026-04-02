import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isRestaurantOpen, formatCurrency } from '@/lib/utils/helpers'
import { MapPin, Truck, Clock, ChevronDown, UtensilsCrossed } from 'lucide-react'

export const revalidate = 60 // revalidar cada minuto (open/closed cambia)

export default async function LandingPage() {
  const supabase = await createClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*, restaurant_hours(*)')
    .eq('is_active', true)
    .order('created_at')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <UtensilsCrossed size={20} className="text-primary" />
            <span>FoodApp</span>
          </div>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium text-white/80">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Pedidos en línea disponibles
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
            Pide en línea,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
              listo en minutos.
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Elige tu restaurante favorito y haz tu pedido sin llamadas, sin esperas.
          </p>

          <a
            href="#restaurantes"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-full hover:bg-slate-100 transition-colors text-sm"
          >
            Ver restaurantes
            <ChevronDown size={16} />
          </a>
        </div>
      </section>

      {/* ── Grid de restaurantes ────────────────────────────── */}
      <section id="restaurantes" className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Restaurantes disponibles</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {restaurants?.length
              ? `${restaurants.length} restaurante${restaurants.length !== 1 ? 's' : ''} cerca de ti`
              : 'Pronto habrá restaurantes disponibles'}
          </p>
        </div>

        {!restaurants?.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <UtensilsCrossed size={48} className="text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Pronto habrá restaurantes disponibles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {restaurants.map((restaurant) => {
              const hours = (restaurant.restaurant_hours ?? []) as Parameters<typeof isRestaurantOpen>[0]
              const isOpen = isRestaurantOpen(hours, restaurant.timezone)

              return (
                <Link
                  key={restaurant.id}
                  href={`/${restaurant.slug}`}
                  className="group flex flex-col bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Accent bar superior con el color del restaurante */}
                  <div
                    className="h-1.5 w-full shrink-0"
                    style={{ backgroundColor: restaurant.primary_color }}
                  />

                  <div className="p-5 flex flex-col flex-1 gap-4">
                    {/* Avatar + nombre */}
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-white text-xl font-bold shrink-0"
                        style={{ backgroundColor: restaurant.primary_color }}
                      >
                        {restaurant.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={restaurant.logo_url}
                            alt={restaurant.name}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          restaurant.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 leading-tight truncate group-hover:underline">
                          {restaurant.name}
                        </h3>
                        {restaurant.address && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="shrink-0" />
                            {restaurant.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                      {restaurant.delivery_enabled && (
                        <div className="flex items-center gap-2">
                          <Truck size={13} className="shrink-0 text-slate-400" />
                          <span>
                            Delivery ·{' '}
                            {restaurant.delivery_fee > 0
                              ? formatCurrency(restaurant.delivery_fee)
                              : 'Gratis'}
                            {restaurant.delivery_min_order > 0 && (
                              <span className="text-xs">
                                {' '}(mín. {formatCurrency(restaurant.delivery_min_order)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="shrink-0 text-slate-400" />
                        <span>Lun–Sáb 10:00–22:00</span>
                      </div>
                    </div>

                    {/* Footer: badge abierto/cerrado + CTA */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          isOpen
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOpen ? 'bg-green-500' : 'bg-slate-400'
                          }`}
                        />
                        {isOpen ? 'Abierto' : 'Cerrado'}
                      </span>

                      <span className="text-sm font-medium text-primary group-hover:underline">
                        Ver menú →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t py-6 px-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FoodApp · Todos los derechos reservados
      </footer>
    </div>
  )
}
