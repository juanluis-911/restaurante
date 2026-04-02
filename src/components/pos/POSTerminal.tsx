'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Plus, Minus, Trash2, CreditCard, Banknote, Smartphone,
  Search, X, ShoppingCart, Package, CheckCircle, UtensilsCrossed,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import type { Database } from '@/types/database'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Product    = Database['public']['Tables']['products']['Row']
type Combo      = Database['public']['Tables']['combos']['Row']
type PosSession = Database['public']['Tables']['pos_sessions']['Row']

interface Category { id: string; name: string; position: number; products: Product[] }
interface CartItem { id: string; name: string; price: number; quantity: number; type: 'product' | 'combo' }

interface Props {
  restaurant: Restaurant
  categories: Category[]
  combos: Combo[]
  openSession: PosSession | null
  userId: string
}

const PAYMENT_METHODS = [
  { value: 'cash'     as const, label: 'Efectivo',      icon: Banknote   },
  { value: 'card'     as const, label: 'Tarjeta',       icon: CreditCard },
  { value: 'transfer' as const, label: 'Transferencia', icon: Smartphone },
]

const ORDER_TYPES = [
  { value: 'dine_in'  as const, label: '🍽 Mesa'   },
  { value: 'pickup'   as const, label: '🛍 Llevar'  },
  { value: 'delivery' as const, label: '🛵 Delivery' },
]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export default function POSTerminal({ restaurant, categories, combos, openSession, userId }: Props) {
  const [session,      setSession]      = useState<PosSession | null>(openSession)
  const [cart,         setCart]         = useState<CartItem[]>([])
  const [orderType,    setOrderType]    = useState<'dine_in' | 'pickup' | 'delivery'>('dine_in')
  const [tableNumber,  setTableNumber]  = useState('')
  const [customerName, setCustomerName] = useState('')
  const [notes,        setNotes]        = useState('')
  const [search,       setSearch]       = useState('')
  const [activeCat,    setActiveCat]    = useState<string>('')
  const [payMethod,    setPayMethod]    = useState<'cash' | 'card' | 'transfer'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [ticketOk,     setTicketOk]     = useState<{ total: number; items: number; payMethod: string } | null>(null)
  const [sessionDialog,setSessionDialog]= useState(!openSession)
  const [openingCash,  setOpeningCash]  = useState('')
  const [mobileTab,    setMobileTab]    = useState<'productos' | 'ticket'>('productos')

  const catRefs = useRef<Record<string, HTMLElement | null>>({})
  const supabase = createClient()

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const change   = payMethod === 'cash' ? Math.max(0, parseFloat(cashReceived || '0') - subtotal) : 0
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const allProducts = categories.flatMap((c) => c.products)
  const searchLower = search.toLowerCase()
  const filteredCategories = search
    ? [{ id: 'search', name: 'Resultados', position: -1, products: allProducts.filter((p) => p.name.toLowerCase().includes(searchLower)) }]
    : categories

  // Scroll to category
  function scrollToCategory(catId: string) {
    setActiveCat(catId)
    catRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // IntersectionObserver for active tab
  useEffect(() => {
    if (search) return
    const observer = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) setActiveCat(e.target.id) } },
      { threshold: 0.25 }
    )
    Object.values(catRefs.current).forEach((el) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [search, categories])

  function addToCart(item: { id: string; name: string; price: number }, type: 'product' | 'combo') {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === item.id)
      if (exists) return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...item, quantity: 1, type }]
    })
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter((i) => i.quantity > 0)
    )
  }

  function clearCart() {
    setCart([])
    setCustomerName('')
    setTableNumber('')
    setNotes('')
    setCashReceived('')
    setTicketOk(null)
  }

  async function openSessionFn() {
    if (!openingCash) return
    setLoading(true)
    try {
      const { data, error } = await supabase.from('pos_sessions')
        .insert({ restaurant_id: restaurant.id, user_id: userId, opening_cash: parseFloat(openingCash), status: 'open' })
        .select().single()
      if (error) throw error
      setSession(data)
      setSessionDialog(false)
      toast.success('Caja abierta')
    } catch { toast.error('Error al abrir caja') }
    finally { setLoading(false) }
  }

  async function checkout() {
    if (cart.length === 0)    { toast.error('El ticket está vacío'); return }
    if (!session)             { toast.error('Abre la caja primero'); return }
    if (orderType === 'dine_in' && !tableNumber.trim()) { toast.error('Ingresa el número de mesa'); return }
    if (payMethod === 'cash' && parseFloat(cashReceived || '0') < subtotal) {
      toast.error('El efectivo recibido es insuficiente'); return
    }
    setLoading(true)
    try {
      const items = cart.map((i) => ({
        ...(i.type === 'product' ? { product_id: i.id } : { combo_id: i.id }),
        name: i.name, quantity: i.quantity, unit_price: i.price,
        subtotal: i.price * i.quantity, discount_amount: 0,
      }))

      const { data: order, error: orderError } = await supabase.from('orders').insert({
        restaurant_id: restaurant.id,
        source: 'pos', order_type: orderType,
        customer_name: customerName,
        table_number: tableNumber || null,
        notes: notes || null,
        items, subtotal, total: subtotal, discount_amount: 0,
        status: 'received', pos_session_id: session.id,
      }).select().single()
      if (orderError) throw orderError

      await supabase.from('pos_transactions').insert({
        pos_session_id: session.id, order_id: order.id,
        restaurant_id: restaurant.id,
        payment_method: payMethod, amount: subtotal, change_amount: change,
      })

      await supabase.from('pos_sessions')
        .update({ total_sales: (session.total_sales ?? 0) + subtotal })
        .eq('id', session.id)

      setTicketOk({ total: subtotal, items: cartCount, payMethod })
      setCart([])
      setCustomerName('')
      setTableNumber('')
      setNotes('')
      setCashReceived('')
    } catch { toast.error('Error al procesar el cobro') }
    finally { setLoading(false) }
  }

  async function closeSession() {
    if (!session) return
    if (!confirm('¿Cerrar la caja?')) return
    await supabase.from('pos_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', session.id)
    setSession(null)
    setSessionDialog(true)
    toast.success('Caja cerrada')
  }

  // ── Ticket de éxito ────────────────────────────────────────────────────
  if (ticketOk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Cobro registrado</h2>
          <p className="text-gray-500 mt-1">
            {fmt(ticketOk.total)} · {ticketOk.items} artículo{ticketOk.items !== 1 ? 's' : ''} ·{' '}
            {PAYMENT_METHODS.find((m) => m.value === ticketOk.payMethod)?.label}
          </p>
          {payMethod === 'cash' && change > 0 && (
            <p className="mt-2 text-lg font-bold text-emerald-600">Cambio: {fmt(change)}</p>
          )}
        </div>
        <button
          onClick={clearCart}
          className="px-6 py-2.5 rounded-xl text-white font-medium text-sm"
          style={{ backgroundColor: restaurant.primary_color }}
        >
          Nueva venta
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── Dialog: abrir caja ────────────────────────────────────── */}
      <Dialog open={sessionDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir caja</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Monto inicial en efectivo</Label>
              <Input type="number" min="0" placeholder="0.00" value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)} autoFocus />
            </div>
            <button
              onClick={openSessionFn}
              disabled={loading || !openingCash}
              className="w-full py-2.5 rounded-xl text-white font-medium text-sm disabled:opacity-50"
              style={{ backgroundColor: restaurant.primary_color }}
            >
              {loading ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Tab bar móvil ──────────────────────────────────────────── */}
      <div className="flex md:hidden rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm mb-4">
        <button
          onClick={() => setMobileTab('productos')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
            mobileTab === 'productos' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'
          )}
          style={mobileTab === 'productos' ? { backgroundColor: restaurant.primary_color } : {}}
        >
          <UtensilsCrossed size={15} /> Productos
        </button>
        <button
          onClick={() => setMobileTab('ticket')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative',
            mobileTab === 'ticket' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'
          )}
          style={mobileTab === 'ticket' ? { backgroundColor: restaurant.primary_color } : {}}
        >
          <ShoppingCart size={15} /> Ticket
          {cartCount > 0 && (
            <span className={cn(
              'absolute top-2 right-6 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center',
              mobileTab === 'ticket' ? 'bg-white' : 'text-white'
            )}
              style={mobileTab === 'ticket' ? { color: restaurant.primary_color } : { backgroundColor: restaurant.primary_color }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Layout principal ────────────────────────────────────────── */}
      <div className="flex gap-4 md:h-[calc(100dvh-10rem)]">

        {/* ── Panel izquierdo: productos ── */}
        <div className={cn(
          'flex-1 flex flex-col gap-3 min-w-0 overflow-hidden',
          mobileTab !== 'productos' ? 'hidden md:flex' : 'flex'
        )}>

          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-900">Punto de venta</h1>
              {session && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  Caja abierta
                </span>
              )}
            </div>
            {session && (
              <button onClick={closeSession}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Cerrar caja
              </button>
            )}
          </div>

          {/* Búsqueda */}
          <div className="relative shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 bg-white"
              style={{ '--tw-ring-color': restaurant.primary_color } as React.CSSProperties}
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category tabs */}
          {!search && (categories.length > 1 || combos.length > 0) && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
              {combos.length > 0 && (
                <button
                  onClick={() => scrollToCategory('combos')}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    activeCat === 'combos' ? 'text-white border-transparent' : 'text-gray-500 bg-white border-gray-200 hover:border-gray-300'
                  )}
                  style={activeCat === 'combos' ? { backgroundColor: restaurant.primary_color } : {}}
                >
                  Combos
                </button>
              )}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    activeCat === cat.id ? 'text-white border-transparent' : 'text-gray-500 bg-white border-gray-200 hover:border-gray-300'
                  )}
                  style={activeCat === cat.id ? { backgroundColor: restaurant.primary_color } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto space-y-5">

            {/* Combos */}
            {!search && combos.length > 0 && (
              <section id="combos" ref={(el) => { catRefs.current['combos'] = el }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Combos</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {combos.map((c) => (
                    <ProductCard
                      key={c.id}
                      name={c.name}
                      price={Number(c.price)}
                      imageUrl={null}
                      badge="Combo"
                      inCart={cart.find((i) => i.id === c.id)?.quantity ?? 0}
                      primaryColor={restaurant.primary_color}
                      onClick={() => addToCart({ id: c.id, name: c.name, price: Number(c.price) }, 'combo')}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Categories */}
            {filteredCategories.map((cat) => (
              <section key={cat.id} id={cat.id} ref={(el) => { catRefs.current[cat.id] = el }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {cat.name}
                </p>
                {cat.products.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Sin resultados</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {cat.products.map((p) => (
                      <ProductCard
                        key={p.id}
                        name={p.name}
                        price={Number(p.price)}
                        imageUrl={p.image_url}
                        badge={p.is_featured ? 'Destacado' : null}
                        inCart={cart.find((i) => i.id === p.id)?.quantity ?? 0}
                        primaryColor={restaurant.primary_color}
                        onClick={() => addToCart({ id: p.id, name: p.name, price: Number(p.price) }, 'product')}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>

        {/* ── Panel derecho: ticket ── */}
        <div className={cn(
          'flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden',
          'md:w-80 md:flex-shrink-0',
          mobileTab !== 'ticket' ? 'hidden md:flex' : 'flex flex-1'
        )}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingCart size={15} style={{ color: restaurant.primary_color }} />
              <span className="font-semibold text-gray-800 text-sm">
                Ticket actual
                {cartCount > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">({cartCount} ítem{cartCount !== 1 ? 's' : ''})</span>
                )}
              </span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Limpiar
              </button>
            )}
          </div>

          {/* Order type */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-50">
            <div className="flex gap-1">
              {ORDER_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setOrderType(value)}
                  className={cn(
                    'flex-1 text-xs py-1.5 rounded-lg border font-medium transition-colors',
                    orderType === value ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 hover:border-gray-300 bg-white'
                  )}
                  style={orderType === value ? { backgroundColor: restaurant.primary_color } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer + table */}
          <div className="px-3 pt-2 pb-2 border-b border-gray-50">
            <div className={cn('grid gap-2', orderType === 'dine_in' ? 'grid-cols-2' : 'grid-cols-1')}>
              <div>
                <label className="text-xs text-gray-500">Cliente</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className="mt-0.5 w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': restaurant.primary_color } as React.CSSProperties}
                />
              </div>
              {orderType === 'dine_in' && (
                <div>
                  <label className="text-xs text-gray-500">Mesa *</label>
                  <input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="#"
                    className="mt-0.5 w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': restaurant.primary_color } as React.CSSProperties}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 py-10">
                <Package size={28} className="opacity-30" />
                <p className="text-xs">Agrega productos al ticket</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: restaurant.primary_color + '20' }}
                  >
                    <Package size={13} style={{ color: restaurant.primary_color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{fmt(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      {item.quantity === 1 ? <Trash2 size={10} /> : <Minus size={10} />}
                    </button>
                    <span className="text-xs font-bold text-gray-800 w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-gray-800 w-12 text-right shrink-0">
                    {fmt(item.price * item.quantity)}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer: totals + payment + cobrar */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-3">

            {/* Totales */}
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total</span>
              <span>{fmt(subtotal)}</span>
            </div>

            {/* Método de pago */}
            <div className="flex gap-1.5">
              {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPayMethod(value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border text-xs font-medium transition-colors',
                    payMethod === value ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 bg-white hover:border-gray-300'
                  )}
                  style={payMethod === value ? { backgroundColor: restaurant.primary_color } : {}}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* Efectivo recibido */}
            {payMethod === 'cash' && (
              <div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 flex-shrink-0">Recibido</label>
                  <input
                    type="number"
                    min={subtotal}
                    step="0.50"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': restaurant.primary_color } as React.CSSProperties}
                  />
                </div>
                {parseFloat(cashReceived) >= subtotal && change > 0 && (
                  <div className="mt-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-emerald-700 text-center">
                    Cambio: {fmt(change)}
                  </div>
                )}
              </div>
            )}

            {/* Notas */}
            <input
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 placeholder:text-gray-300"
              style={{ '--tw-ring-color': restaurant.primary_color } as React.CSSProperties}
            />

            <button
              onClick={checkout}
              disabled={loading || cart.length === 0 ||
                (orderType === 'dine_in' && !tableNumber.trim()) ||
                (payMethod === 'cash' && parseFloat(cashReceived || '0') < subtotal)}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-40"
              style={{ backgroundColor: restaurant.primary_color }}
            >
              {loading ? 'Procesando...' : `Cobrar ${cart.length > 0 ? fmt(subtotal) : ''}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Tarjeta de producto ─────────────────────────────────────────────────
function ProductCard({
  name, price, imageUrl, badge, inCart, primaryColor, onClick,
}: {
  name: string; price: number; imageUrl: string | null
  badge: string | null; inCart: number; primaryColor: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative text-left p-3 rounded-xl border-2 transition-all',
        inCart > 0
          ? 'border-opacity-60 bg-opacity-5'
          : 'border-gray-200 bg-white hover:border-opacity-40'
      )}
      style={inCart > 0
        ? { borderColor: primaryColor, backgroundColor: primaryColor + '08' }
        : undefined}
    >
      {inCart > 0 && (
        <span
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          {inCart}
        </span>
      )}

      {imageUrl ? (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2">
          <Image src={imageUrl} alt={name} fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center"
          style={{ backgroundColor: primaryColor + '15' }}>
          <UtensilsCrossed size={22} style={{ color: primaryColor + '80' }} />
        </div>
      )}

      {badge && (
        <span
          className="absolute top-2 right-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: primaryColor }}
        >
          {badge}
        </span>
      )}

      <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{name}</p>
      <p className="text-sm font-bold mt-1" style={{ color: primaryColor }}>{fmt(price)}</p>
    </button>
  )
}
