import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils/helpers'
import { Package, MapPin, LogOut, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ClienteLogoutButton from '@/components/cliente/ClienteLogoutButton'

type OrderItem = { name: string; quantity: number; unit_price: number; subtotal: number; notes?: string }
type DeliveryAddress = { street?: string; neighborhood?: string; city?: string; references?: string }

type Order = {
  id: string
  restaurant_id: string
  order_type: string
  status: string
  items: OrderItem[]
  subtotal: number
  discount_amount: number
  delivery_fee: number
  total: number
  coupon_code: string | null
  notes: string | null
  created_at: string
  restaurants: { name: string; slug: string; primary_color: string; logo_url: string | null } | null
  delivery_address: DeliveryAddress | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received:    { label: 'Recibido',    color: 'bg-blue-50 text-blue-700' },
  accepted:    { label: 'Aceptado',    color: 'bg-indigo-50 text-indigo-700' },
  preparing:   { label: 'Preparando',  color: 'bg-yellow-50 text-yellow-700' },
  ready:       { label: 'Listo',       color: 'bg-orange-50 text-orange-700' },
  on_the_way:  { label: 'En camino',   color: 'bg-purple-50 text-purple-700' },
  delivered:   { label: 'Entregado',   color: 'bg-green-50 text-green-700' },
  cancelled:   { label: 'Cancelado',   color: 'bg-red-50 text-red-700' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function ClienteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/cliente/login')

  // Verificar que sea cliente (no redirigir owners/drivers, solo proteger la ruta)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'restaurant_owner') redirect('/dashboard')
  if (profile?.role === 'driver') redirect('/driver')

  // Obtener pedidos del cliente por email
  const { data: orders } = await supabase
    .from('orders')
    .select('id, restaurant_id, order_type, status, items, subtotal, discount_amount, delivery_fee, total, coupon_code, notes, created_at, delivery_address, restaurants(name, slug, primary_color, logo_url)')
    .eq('customer_email', user.email!)
    .eq('source', 'online')
    .order('created_at', { ascending: false })
    .limit(50) as { data: Order[] | null }

  // Extraer direcciones únicas de pedidos de delivery
  const addressMap = new Map<string, DeliveryAddress>()
  orders?.forEach((o) => {
    if (o.order_type === 'delivery' && o.delivery_address?.street) {
      const key = `${o.delivery_address.street}|${o.delivery_address.neighborhood ?? ''}|${o.delivery_address.city ?? ''}`
      if (!addressMap.has(key)) addressMap.set(key, o.delivery_address)
    }
  })
  const savedAddresses = Array.from(addressMap.values())

  const activeOrders = orders?.filter((o) => !['delivered', 'cancelled'].includes(o.status)) ?? []
  const pastOrders   = orders?.filter((o) =>  ['delivered', 'cancelled'].includes(o.status)) ?? []

  const displayName = user.user_metadata?.full_name ?? user.email

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <Image src="/turieats.png" alt="TuriEats" width={100} height={30} className="h-7 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[180px]">{displayName}</span>
            <ClienteLogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
        {/* ── Bienvenida ── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi cuenta</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{user.email}</p>
        </div>

        {/* ── Pedidos activos ── */}
        {activeOrders.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              Pedidos en curso
            </h2>
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        )}

        {/* ── Direcciones guardadas ── */}
        {savedAddresses.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-slate-500" />
              Mis direcciones
            </h2>
            <div className="bg-white rounded-xl border divide-y">
              {savedAddresses.map((addr, i) => (
                <div key={i} className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">{addr.street}</p>
                  {(addr.neighborhood || addr.city) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[addr.neighborhood, addr.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {addr.references && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">Ref: {addr.references}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Historial de pedidos ── */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Package size={16} className="text-slate-500" />
            Historial de pedidos
          </h2>

          {!pastOrders.length ? (
            <div className="bg-white rounded-xl border px-6 py-12 text-center">
              <Package size={36} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aún no tienes pedidos</p>
              <Link
                href="/"
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                Ver restaurantes →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {pastOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-5 px-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} TuriEats · Todos los derechos reservados
      </footer>
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const status = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-slate-100 text-slate-600' }
  const restaurant = order.restaurants
  const itemCount = (order.items as OrderItem[]).reduce((s, i) => s + i.quantity, 0)
  const itemNames = (order.items as OrderItem[]).slice(0, 3).map((i) => i.name).join(', ')
  const isActive = !['delivered', 'cancelled'].includes(order.status)

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Color bar */}
      {restaurant && (
        <div className="h-1 w-full" style={{ backgroundColor: restaurant.primary_color }} />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-slate-900 truncate">
                {restaurant?.name ?? 'Restaurante'}
              </p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(order.created_at)}</p>
            <p className="text-xs text-slate-600 mt-1.5 truncate">
              {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'} · {itemNames}{(order.items as OrderItem[]).length > 3 ? '...' : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold text-sm text-slate-900">{formatCurrency(order.total)}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {order.order_type === 'delivery' ? 'Delivery' : order.order_type === 'pickup' ? 'Para recoger' : 'Mesa'}
            </p>
          </div>
        </div>

        {/* Dirección de entrega */}
        {order.order_type === 'delivery' && order.delivery_address?.street && (
          <div className="flex items-start gap-1.5 mt-2.5 text-xs text-muted-foreground">
            <MapPin size={11} className="shrink-0 mt-0.5" />
            <span>{order.delivery_address.street}{order.delivery_address.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}</span>
          </div>
        )}

        {/* Link a seguimiento si está activo */}
        {isActive && restaurant && (
          <Link
            href={`/${restaurant.slug}/order/${order.id}`}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Seguir pedido
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
    </div>
  )
}
