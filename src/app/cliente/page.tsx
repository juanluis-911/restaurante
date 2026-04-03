import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/helpers'
import { MapPin, Package, Clock, UtensilsCrossed, TrendingUp, Home, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ClienteLogoutButton from '@/components/cliente/ClienteLogoutButton'
import { OrderHistoryCard } from '@/components/cliente/OrderHistoryCard'
import InstallBanner from '@/components/shared/InstallBanner'
import type { OrderCardData } from '@/components/cliente/OrderHistoryCard'

type DeliveryAddress = { street?: string; neighborhood?: string; city?: string; references?: string }

const STATUS_STEPS = ['received', 'accepted', 'preparing', 'ready', 'on_the_way', 'delivered']
const STATUS_LABELS: Record<string, string> = {
  received:   'Recibido',
  accepted:   'Aceptado',
  preparing:  'Preparando',
  ready:      'Listo',
  on_the_way: 'En camino',
  delivered:  'Entregado',
  cancelled:  'Cancelado',
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getInitials(nameOrEmail: string) {
  const parts = nameOrEmail.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nameOrEmail.slice(0, 2).toUpperCase()
}

export default async function ClienteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/cliente/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'restaurant_owner') redirect('/dashboard')
  if (profile?.role === 'driver') redirect('/driver')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, restaurant_id, order_type, status, items, subtotal, discount_amount, delivery_fee, total, coupon_code, notes, created_at, delivery_address, restaurants(name, slug, primary_color, logo_url)')
    .eq('customer_email', user.email!)
    .eq('source', 'online')
    .order('created_at', { ascending: false })
    .limit(100) as { data: OrderCardData[] | null }

  const allOrders   = orders ?? []
  const activeOrders = allOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
  const pastOrders   = allOrders.filter((o) =>  ['delivered', 'cancelled'].includes(o.status))

  // Stats
  const totalSpent    = allOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0)
  const totalOrders   = allOrders.filter((o) => o.status !== 'cancelled').length
  const restaurantSet = new Set(allOrders.filter((o) => o.status !== 'cancelled').map((o) => o.restaurants?.name))
  const uniqueRests   = restaurantSet.size

  // Favorite restaurant
  const restCount = new Map<string, number>()
  allOrders.filter((o) => o.status !== 'cancelled' && o.restaurants?.name).forEach((o) => {
    const name = o.restaurants!.name
    restCount.set(name, (restCount.get(name) ?? 0) + 1)
  })
  const favoriteRest = [...restCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  // Saved addresses (unique, most recent first)
  const addressMap = new Map<string, DeliveryAddress>()
  allOrders.forEach((o) => {
    if (o.order_type === 'delivery' && (o.delivery_address as DeliveryAddress)?.street) {
      const addr = o.delivery_address as DeliveryAddress
      const key = `${addr.street}|${addr.neighborhood ?? ''}|${addr.city ?? ''}`
      if (!addressMap.has(key)) addressMap.set(key, addr)
    }
  })
  const savedAddresses = Array.from(addressMap.values())

  const displayName = user.user_metadata?.full_name ?? user.email ?? ''
  const initials    = getInitials(displayName)
  const memberSince = formatDateShort(user.created_at)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Install Banner ─────────────────────────────────── */}
      <InstallBanner />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/turieats.png" alt="TuriEats" width={160} height={48} className="h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              <Home size={14} />
              Restaurantes
            </Link>
            <ClienteLogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">

        {/* ── Perfil hero ─────────────────────────────────── */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-10 -left-6 w-40 h-40 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white text-xl font-bold shadow-lg">
              {initials}
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{displayName}</h1>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
              <p className="text-xs text-slate-500 mt-0.5">Miembro desde {memberSince}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{totalOrders}</p>
              <p className="text-xs text-slate-400 mt-0.5">Pedidos</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Gastado</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{uniqueRests}</p>
              <p className="text-xs text-slate-400 mt-0.5">Restaurantes</p>
            </div>
          </div>

          {/* Favorite */}
          {favoriteRest && (
            <div className="relative mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <TrendingUp size={14} className="text-orange-400 shrink-0" />
              <p className="text-xs text-slate-300">
                Tu favorito: <span className="font-semibold text-white">{favoriteRest}</span>
                <span className="text-slate-400"> · {restCount.get(favoriteRest)} pedidos</span>
              </p>
            </div>
          )}
        </div>

        {/* ── Pedidos activos ─────────────────────────────── */}
        {activeOrders.length > 0 && (
          <section>
            <SectionTitle icon={<Clock size={15} className="text-orange-500" />} title="Pedidos en curso" count={activeOrders.length} />
            <div className="space-y-3 mt-3">
              {activeOrders.map((order) => (
                <ActiveOrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* ── Direcciones guardadas ────────────────────────── */}
        <section>
          <SectionTitle icon={<MapPin size={15} className="text-slate-500" />} title="Mis direcciones" count={savedAddresses.length || undefined} />
          <div className="mt-3">
            {savedAddresses.length === 0 ? (
              <div className="bg-white rounded-2xl border px-6 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 mb-3">
                  <MapPin size={20} className="text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-slate-700">Sin direcciones guardadas</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tus direcciones de entrega se guardarán aquí automáticamente después de tu primer pedido a domicilio.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((addr, i) => (
                  <div key={i} className="bg-white rounded-xl border p-4 flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <MapPin size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{addr.street}</p>
                      {(addr.neighborhood || addr.city) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[addr.neighborhood, addr.city].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {addr.references && (
                        <p className="text-xs text-muted-foreground italic mt-0.5 truncate">Ref: {addr.references}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Historial de pedidos ─────────────────────────── */}
        <section>
          <SectionTitle icon={<Package size={15} className="text-slate-500" />} title="Historial de pedidos" count={pastOrders.length || undefined} />

          {!pastOrders.length ? (
            <div className="mt-3 bg-white rounded-2xl border px-6 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                <UtensilsCrossed size={24} className="text-muted-foreground/50" />
              </div>
              <p className="font-medium text-slate-700">Aún no tienes pedidos</p>
              <p className="text-sm text-muted-foreground mt-1">Explora los restaurantes y haz tu primer pedido</p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Ver restaurantes
                <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {pastOrders.map((order) => (
                <OrderHistoryCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-5 px-4 text-center text-xs text-muted-foreground mt-4">
        © {new Date().getFullYear()} TuriEats · Todos los derechos reservados
      </footer>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function SectionTitle({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {count !== undefined && (
        <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

function ActiveOrderCard({ order }: { order: OrderCardData }) {
  const restaurant = order.restaurants
  const stepIndex  = STATUS_STEPS.indexOf(order.status)
  const items      = order.items as Array<{ name: string; quantity: number }>
  const itemSummary = items.slice(0, 2).map((i) => `${i.quantity}× ${i.name}`).join(', ') + (items.length > 2 ? `… +${items.length - 2}` : '')

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {restaurant && <div className="h-1 w-full" style={{ backgroundColor: restaurant.primary_color }} />}
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm"
              style={{ backgroundColor: restaurant?.primary_color ?? '#64748b' }}
            >
              {restaurant?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.logo_url} alt={restaurant.name} className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <UtensilsCrossed size={16} />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-900">{restaurant?.name}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{itemSummary}</p>
            </div>
          </div>
          <span className="text-sm font-bold text-slate-900">{formatCurrency(order.total)}</span>
        </div>

        {/* Status stepper */}
        <div className="space-y-2">
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const done    = i <= stepIndex
              const current = i === stepIndex
              return (
                <div key={step} className="flex-1 flex items-center">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${
                    current ? 'ring-2 ring-offset-1 ring-orange-400 bg-orange-400' :
                    done    ? 'bg-orange-400' : 'bg-slate-200'
                  }`} />
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 transition-colors ${done ? 'bg-orange-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between">
            {STATUS_STEPS.map((step) => (
              <span key={step} className={`text-[10px] text-center flex-1 ${step === order.status ? 'font-semibold text-orange-600' : 'text-muted-foreground'}`}>
                {STATUS_LABELS[step]}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        {restaurant && (
          <Link
            href={`/${restaurant.slug}/order/${order.id}`}
            className="flex items-center justify-between bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-xl px-3 py-2.5 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-orange-700">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              Seguir pedido en tiempo real
            </span>
            <ChevronRight size={14} className="text-orange-500" />
          </Link>
        )}
      </div>
    </div>
  )
}
