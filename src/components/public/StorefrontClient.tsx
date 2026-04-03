'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils/helpers'
import { ShoppingCart, Clock, Phone, Plus, Minus, X, Ticket, ArrowLeft, CreditCard, Banknote, ChevronRight, LogIn } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/types/database'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Menu       = Database['public']['Tables']['menus']['Row']
type Category   = Database['public']['Tables']['categories']['Row']
type Product    = Database['public']['Tables']['products']['Row']
type Combo      = Database['public']['Tables']['combos']['Row']
type Discount   = Database['public']['Tables']['discounts']['Row']

interface Props {
  restaurant: Restaurant
  isOpen: boolean
  menus: Menu[]
  categories: Category[]
  products: Product[]
  combos: Combo[]
  discounts: Discount[]
  isLoggedIn: boolean
}

export default function StorefrontClient({
  restaurant, isOpen, menus, categories, products, combos, discounts, isLoggedIn,
}: Props) {
  const [activeMenuId,  setActiveMenuId]  = useState(menus[0]?.id ?? null)
  const [cartOpen,      setCartOpen]      = useState(false)
  const [checkoutOpen,  setCheckoutOpen]  = useState(false)
  const [loginPrompt,   setLoginPrompt]   = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [activeCatId,   setActiveCatId]   = useState<string | null>(null)
  const catRefs = useRef<Record<string, HTMLElement | null>>({})

  const hasStripe      = restaurant.stripe_account_status === 'active' && !!restaurant.stripe_account_id
  const headerImageUrl = (restaurant as { header_image_url?: string | null }).header_image_url
  const primaryColor   = restaurant.primary_color

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    order_type: 'pickup' as 'dine_in' | 'pickup' | 'delivery',
    notes: '', coupon_code: '',
    delivery_street: '', delivery_neighborhood: '', delivery_city: '', delivery_references: '',
  })
  const [couponDiscount,   setCouponDiscount]   = useState<Discount | null>(null)
  const [couponValidating, setCouponValidating] = useState(false)

  const cart     = useCart()
  const supabase = createClient()

  // ── Prellenar form con datos del cliente logueado ──────────
  useEffect(() => {
    async function prefillFromUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const name  = user.user_metadata?.full_name ?? ''
      const email = user.email ?? ''
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('customer_phone, delivery_address')
        .eq('customer_email', email)
        .eq('order_type', 'delivery')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const addr = lastOrder?.delivery_address as {
        street?: string; neighborhood?: string; city?: string; references?: string
      } | null
      setForm((prev) => ({
        ...prev,
        customer_name:         name  || prev.customer_name,
        customer_email:        email || prev.customer_email,
        customer_phone:        lastOrder?.customer_phone || prev.customer_phone,
        delivery_street:       addr?.street        || prev.delivery_street,
        delivery_neighborhood: addr?.neighborhood  || prev.delivery_neighborhood,
        delivery_city:         addr?.city          || prev.delivery_city,
        delivery_references:   addr?.references    || prev.delivery_references,
      }))
    }
    prefillFromUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Descuentos automáticos ─────────────────────────────────
  function getDiscountedPrice(product: Product): number {
    const d = discounts.find((d) =>
      d.is_active && (
        d.scope === 'all' ||
        (d.scope === 'product' && d.target_ids?.includes(product.id))
      )
    )
    if (!d) return Number(product.price)
    if (d.type === 'percentage') return Math.max(0, Number(product.price) * (1 - Number(d.value) / 100))
    if (d.type === 'fixed')      return Math.max(0, Number(product.price) - Number(d.value))
    return Number(product.price)
  }

  // ── Totales ────────────────────────────────────────────────
  const subtotalOriginal = cart.items.reduce((s, i) => s + i.original_price * i.quantity, 0)
  const subtotalFinal    = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const autoDiscount     = subtotalOriginal - subtotalFinal

  const couponAmount = useMemo(() => {
    if (!couponDiscount) return 0
    if (couponDiscount.type === 'percentage') return subtotalFinal * (Number(couponDiscount.value) / 100)
    if (couponDiscount.type === 'fixed')      return Math.min(Number(couponDiscount.value), subtotalFinal)
    return 0
  }, [couponDiscount, subtotalFinal])

  const totalDiscount = autoDiscount + couponAmount
  const orderTotal    = Math.max(0, subtotalOriginal - totalDiscount)

  // ── Cupón ──────────────────────────────────────────────────
  async function validateCoupon() {
    const code = form.coupon_code.trim().toUpperCase()
    if (!code) return
    setCouponValidating(true)
    try {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*, discounts(*)')
        .eq('restaurant_id', restaurant.id)
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle()
      if (!coupon) { toast.error('Cupón inválido o inactivo'); return }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) { toast.error('Este cupón ya venció'); return }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) { toast.error('Este cupón ya alcanzó su límite de usos'); return }
      setCouponDiscount(coupon.discounts as unknown as Discount)
      toast.success(`Cupón "${code}" aplicado`)
    } catch { toast.error('Error al validar el cupón') }
    finally { setCouponValidating(false) }
  }

  function removeCoupon() {
    setCouponDiscount(null)
    setForm((p) => ({ ...p, coupon_code: '' }))
  }

  function validateCheckoutForm() {
    if (!form.customer_name.trim()) { toast.error('Ingresa tu nombre'); return false }
    if (cart.isEmpty) { toast.error('El carrito está vacío'); return false }
    if (form.order_type === 'delivery') {
      if (!form.delivery_street.trim()) { toast.error('Ingresa tu calle y número'); return false }
      if (!form.delivery_city.trim()) { toast.error('Ingresa tu ciudad'); return false }
    }
    return true
  }

  // ── Stripe ─────────────────────────────────────────────────
  async function handleStripePayment() {
    if (!validateCheckoutForm()) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id:   restaurant.id,
          order_type:      form.order_type,
          customer_name:   form.customer_name,
          customer_phone:  form.customer_phone,
          customer_email:  form.customer_email,
          notes:           form.notes,
          coupon_code:     couponDiscount ? form.coupon_code.toUpperCase() : '',
          coupon_discount: couponAmount,
          delivery_address: form.order_type === 'delivery' ? {
            street:       form.delivery_street.trim(),
            neighborhood: form.delivery_neighborhood.trim() || undefined,
            city:         form.delivery_city.trim(),
            references:   form.delivery_references.trim() || undefined,
          } : null,
          items: cart.items.map((i) => ({
            id: i.id, type: i.type, name: i.name,
            quantity: i.quantity, unit_price: i.price, original_price: i.original_price,
          })),
          subtotal:        subtotalOriginal,
          discount_amount: totalDiscount,
          delivery_fee:    form.order_type === 'delivery' ? Number(restaurant.delivery_fee) : 0,
          total:           orderTotal,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Error')
      cart.clearCart()
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar el pago')
    } finally { setLoading(false) }
  }

  // ── Pagar al recibir ───────────────────────────────────────
  async function placeOrder() {
    if (!validateCheckoutForm()) return
    setLoading(true)
    try {
      const items = cart.items.map((i) => ({
        ...(i.type === 'product' ? { product_id: i.id } : { combo_id: i.id }),
        name: i.name, quantity: i.quantity,
        unit_price: i.price,
        subtotal: i.price * i.quantity,
        discount_amount: (i.original_price - i.price) * i.quantity,
      }))
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          restaurant_id:  restaurant.id, source: 'online',
          order_type:     form.order_type,
          customer_name:  form.customer_name,
          customer_phone: form.customer_phone || null,
          customer_email: form.customer_email || null,
          notes:          form.notes || null,
          coupon_code:    couponDiscount ? form.coupon_code.toUpperCase() : null,
          delivery_address: form.order_type === 'delivery' ? {
            street:       form.delivery_street.trim(),
            neighborhood: form.delivery_neighborhood.trim() || undefined,
            city:         form.delivery_city.trim(),
            references:   form.delivery_references.trim() || undefined,
          } : null,
          items, subtotal: subtotalOriginal, discount_amount: totalDiscount,
          total: orderTotal, status: 'received',
        })
        .select().single()
      if (error) throw error
      if (couponDiscount) {
        const { data: c } = await supabase.from('coupons').select('used_count')
          .eq('code', form.coupon_code.toUpperCase()).eq('restaurant_id', restaurant.id).single()
        if (c) await supabase.from('coupons')
          .update({ used_count: c.used_count + 1 })
          .eq('code', form.coupon_code.toUpperCase()).eq('restaurant_id', restaurant.id)
      }
      cart.clearCart()
      setCheckoutOpen(false)
      setCartOpen(false)
      window.location.href = `/${restaurant.slug}/order/${order.id}`
    } catch { toast.error('Error al enviar el pedido') }
    finally { setLoading(false) }
  }

  // ── Scroll a categoría ─────────────────────────────────────
  function scrollToCategory(id: string) {
    setActiveCatId(id)
    catRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const menuCategories = categories.filter((c) => c.menu_id === activeMenuId)
  const allCatIds      = [
    ...menuCategories.map((c) => c.id),
    ...(combos.length > 0 ? ['__combos__'] : []),
  ]

  // ── UI ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50" style={{ '--color-primary': primaryColor } as React.CSSProperties}>

      {/* ── Hero header ──────────────────────────────────────── */}
      <header>
        {/* Imagen de portada */}
        <div
          className="relative h-44 w-full overflow-hidden"
          style={{ backgroundColor: primaryColor }}
        >
          {headerImageUrl ? (
            <img src={headerImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white" />
              <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-white" />
            </div>
          )}
          {/* Gradiente inferior */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Back link */}
          <Link
            href="/"
            className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 hover:text-white text-xs font-medium bg-black/30 rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
          >
            <ArrowLeft size={13} /> Todos los restaurantes
          </Link>

          {/* Info del restaurante sobre la imagen */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              {/* Logo */}
              <div className="shrink-0 h-16 w-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-white">
                {restaurant.logo_url ? (
                  <img src={restaurant.logo_url} alt={restaurant.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: primaryColor }}>
                    {restaurant.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="mb-1">
                <h1 className="text-white font-bold text-xl leading-tight drop-shadow">{restaurant.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isOpen ? 'bg-green-500 text-white' : 'bg-white/20 text-white/80'}`}>
                    {isOpen ? '● Abierto' : '○ Cerrado'}
                  </span>
                  {restaurant.phone && (
                    <span className="text-white/70 text-xs flex items-center gap-1">
                      <Phone size={10} /> {restaurant.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Botón carrito */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative shrink-0 flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingCart size={16} />
              {cart.totalItems > 0 ? (
                <>
                  <span className="hidden sm:inline">{formatCurrency(cart.subtotal)}</span>
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cart.totalItems}
                  </span>
                </>
              ) : (
                <span className="text-white/80 text-xs">Vacío</span>
              )}
            </button>
          </div>
        </div>

        {/* ── Nav: menús ── */}
        {menus.length > 1 && (
          <div className="bg-white border-b">
            <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {menus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => { setActiveMenuId(menu.id); setActiveCatId(null) }}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium transition-colors ${activeMenuId === menu.id ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  style={activeMenuId === menu.id ? { backgroundColor: primaryColor } : {}}
                >
                  {menu.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Nav: categorías sticky ── */}
        {allCatIds.length > 1 && (
          <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
            <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto py-2 scrollbar-hide">
              {menuCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap font-medium transition-colors ${activeCatId === cat.id ? 'text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                  style={activeCatId === cat.id ? { backgroundColor: primaryColor } : {}}
                >
                  {cat.name}
                </button>
              ))}
              {combos.length > 0 && (
                <button
                  onClick={() => scrollToCategory('__combos__')}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap font-medium transition-colors ${activeCatId === '__combos__' ? 'text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                  style={activeCatId === '__combos__' ? { backgroundColor: primaryColor } : {}}
                >
                  Combos
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-5">

        {/* Aviso cerrado */}
        {!isOpen && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
            <Clock size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800">
              El restaurante está cerrado en este momento. Puedes explorar el menú pero no realizar pedidos.
            </p>
          </div>
        )}

        {/* ── Categorías + productos ── */}
        {menuCategories.map((category) => {
          const catProducts = products.filter((p) => p.category_id === category.id && p.is_active)
          if (catProducts.length === 0) return null

          return (
            <section
              key={category.id}
              ref={(el) => { catRefs.current[category.id] = el }}
              className="mb-8 scroll-mt-16"
            >
              <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-slate-200" style={{ maxWidth: 16, minWidth: 16 }} />
                {category.name}
                <span className="h-px flex-1 bg-slate-200" />
              </h2>

              <div className="space-y-3">
                {catProducts.map((product) => {
                  const discountedPrice = getDiscountedPrice(product)
                  const hasDiscount     = discountedPrice < Number(product.price)
                  const inCart          = cart.items.find((i) => i.id === product.id)

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border shadow-sm overflow-hidden flex gap-0 hover:shadow-md transition-shadow"
                    >
                      {/* Imagen */}
                      {product.image_url ? (
                        <div className="w-28 shrink-0 relative">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                          {hasDiscount && (
                            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              OFERTA
                            </span>
                          )}
                        </div>
                      ) : hasDiscount && (
                        <div className="w-1 shrink-0" style={{ backgroundColor: primaryColor }} />
                      )}

                      {/* Contenido */}
                      <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start gap-2 justify-between">
                            <p className="font-semibold text-slate-900 leading-snug">{product.name}</p>
                            {product.is_featured && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: primaryColor }}>
                                ★ Top
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{product.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2.5 gap-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-base" style={{ color: primaryColor }}>
                              {formatCurrency(discountedPrice)}
                            </span>
                            {hasDiscount && (
                              <span className="text-xs text-slate-400 line-through">
                                {formatCurrency(Number(product.price))}
                              </span>
                            )}
                          </div>

                          {inCart ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-slate-100 transition-colors"
                                onClick={() => cart.updateQuantity(product.id, 'product', inCart.quantity - 1)}
                              >
                                {inCart.quantity === 1 ? <X size={11} /> : <Minus size={11} />}
                              </button>
                              <span className="font-bold text-sm w-5 text-center">{inCart.quantity}</span>
                              <button
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80"
                                style={{ backgroundColor: primaryColor }}
                                onClick={() => cart.updateQuantity(product.id, 'product', inCart.quantity + 1)}
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="flex items-center gap-1 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                              style={{ backgroundColor: primaryColor }}
                              onClick={() => cart.addItem({
                                id: product.id, type: 'product', name: product.name,
                                price: discountedPrice, original_price: Number(product.price),
                                image_url: product.image_url,
                              })}
                            >
                              <Plus size={12} /> Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* ── Combos ── */}
        {combos.length > 0 && (
          <section
            ref={(el) => { catRefs.current['__combos__'] = el }}
            className="mb-8 scroll-mt-16"
          >
            <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-200" style={{ maxWidth: 16, minWidth: 16 }} />
              Combos
              <Badge variant="secondary" className="text-[10px] font-bold">Ahorra más</Badge>
              <span className="h-px flex-1 bg-slate-200" />
            </h2>

            <div className="space-y-3">
              {combos.map((combo) => {
                const inCart = cart.items.find((i) => i.id === combo.id)
                return (
                  <div
                    key={combo.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden flex hover:shadow-md transition-shadow"
                    style={{ border: `1.5px solid ${primaryColor}30` }}
                  >
                    {combo.image_url && (
                      <div className="w-28 shrink-0">
                        <img src={combo.image_url} alt={combo.name} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start gap-2">
                          <p className="font-semibold text-slate-900 leading-snug flex-1">{combo.name}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ backgroundColor: primaryColor }}>
                            COMBO
                          </span>
                        </div>
                        {combo.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{combo.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2.5 gap-2">
                        <span className="font-bold text-base" style={{ color: primaryColor }}>
                          {formatCurrency(Number(combo.price))}
                        </span>
                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-slate-100 transition-colors"
                              onClick={() => cart.updateQuantity(combo.id, 'combo', inCart.quantity - 1)}
                            >
                              {inCart.quantity === 1 ? <X size={11} /> : <Minus size={11} />}
                            </button>
                            <span className="font-bold text-sm w-5 text-center">{inCart.quantity}</span>
                            <button
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80"
                              style={{ backgroundColor: primaryColor }}
                              onClick={() => cart.updateQuantity(combo.id, 'combo', inCart.quantity + 1)}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="flex items-center gap-1 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                            style={{ backgroundColor: primaryColor }}
                            onClick={() => cart.addItem({
                              id: combo.id, type: 'combo', name: combo.name,
                              price: Number(combo.price), original_price: Number(combo.price),
                              image_url: combo.image_url,
                            })}
                          >
                            <Plus size={12} /> Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* ── FAB carrito ─────────────────────────────────────── */}
      {cart.totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => setCartOpen(true)}
            className="shadow-2xl flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl text-white text-sm font-semibold"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {cart.totalItems}
            </span>
            <span>Ver carrito</span>
            <span className="opacity-80">·</span>
            <span>{formatCurrency(cart.subtotal)}</span>
            <ChevronRight size={14} className="opacity-70" />
          </button>
        </div>
      )}

      {/* ── Dialog: Carrito ──────────────────────────────────── */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart size={16} /> Tu pedido
            </DialogTitle>
          </DialogHeader>
          {cart.isEmpty ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">🛒</div>
              <p className="text-sm text-muted-foreground">El carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-3">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-slate-100"
                        onClick={() => cart.updateQuantity(item.id, item.type, item.quantity - 1)}
                      >
                        {item.quantity === 1 ? <X size={11} /> : <Minus size={11} />}
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                      <button
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: primaryColor }}
                        onClick={() => cart.updateQuantity(item.id, item.type, item.quantity + 1)}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    <span className="text-sm font-bold w-16 text-right shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-1">
                {autoDiscount > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Descuento automático</span><span>−{formatCurrency(autoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span><span>{formatCurrency(cart.subtotal)}</span>
                </div>
              </div>

              <Button
                className="w-full rounded-xl font-semibold"
                style={{ backgroundColor: primaryColor }}
                onClick={() => {
                  if (!isLoggedIn) { setLoginPrompt(true); return }
                  setCartOpen(false)
                  setCheckoutOpen(true)
                }}
              >
                Continuar con el pedido <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Login prompt ─────────────────────────────── */}
      <Dialog open={loginPrompt} onOpenChange={setLoginPrompt}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: primaryColor + '15' }}>
              🔐
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Inicia sesión para pedir</DialogTitle>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Crea una cuenta gratis o inicia sesión para completar tu pedido y hacer seguimiento en tiempo real.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full pt-1">
              <a
                href={`/cliente/login?modo=registro&next=/${restaurant.slug}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <LogIn size={15} /> Crear cuenta gratis
              </a>
              <a
                href={`/cliente/login?next=/${restaurant.slug}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Ya tengo cuenta · Iniciar sesión
              </a>
            </div>
            <p className="text-xs text-slate-400">Tu carrito se guardará al volver</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Checkout ─────────────────────────────────── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Datos del pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">

            {/* Nombre y teléfono */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tu nombre *</Label>
                <Input placeholder="¿Cómo te llamamos?" value={form.customer_name}
                  onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input type="tel" placeholder="644 123 4567" value={form.customer_phone}
                  onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))} />
              </div>
            </div>

            {/* Tipo de pedido */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de pedido</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['pickup', 'dine_in', ...(restaurant.delivery_enabled ? ['delivery' as const] : [])] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((p) => ({ ...p, order_type: t }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.order_type === t ? 'text-white border-transparent' : 'hover:bg-slate-50 border-slate-200 text-slate-600'}`}
                    style={form.order_type === t ? { backgroundColor: primaryColor } : {}}
                  >
                    {t === 'dine_in' ? '🍽 Mesa' : t === 'pickup' ? '🛍 Recoger' : '🛵 Domicilio'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dirección de entrega */}
            {form.order_type === 'delivery' && (
              <div className="space-y-3 rounded-xl border p-3 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700">Dirección de entrega</p>
                <div className="space-y-2">
                  <Input placeholder="Calle y número *" value={form.delivery_street}
                    onChange={(e) => setForm((p) => ({ ...p, delivery_street: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Colonia" value={form.delivery_neighborhood}
                      onChange={(e) => setForm((p) => ({ ...p, delivery_neighborhood: e.target.value }))} />
                    <Input placeholder="Ciudad *" value={form.delivery_city}
                      onChange={(e) => setForm((p) => ({ ...p, delivery_city: e.target.value }))} />
                  </div>
                  <Input placeholder="Referencias (ej: casa azul)" value={form.delivery_references}
                    onChange={(e) => setForm((p) => ({ ...p, delivery_references: e.target.value }))} />
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notas del pedido</Label>
              <Input placeholder="Sin cebolla, extra salsa..." value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            {/* Cupón */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Ticket size={12} /> Cupón de descuento</Label>
              {couponDiscount ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-green-700">{form.coupon_code.toUpperCase()}</p>
                    <p className="text-xs text-green-600">
                      {couponDiscount.type === 'percentage'
                        ? `${couponDiscount.value}% de descuento`
                        : `${formatCurrency(Number(couponDiscount.value))} de descuento`}
                    </p>
                  </div>
                  <button onClick={removeCoupon} className="text-green-600 hover:text-green-800"><X size={15} /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="CODIGO123" value={form.coupon_code}
                    onChange={(e) => setForm((p) => ({ ...p, coupon_code: e.target.value.toUpperCase() }))}
                    className="font-mono uppercase" />
                  <Button variant="outline" onClick={validateCoupon}
                    disabled={couponValidating || !form.coupon_code.trim()}>
                    {couponValidating ? '...' : 'Aplicar'}
                  </Button>
                </div>
              )}
            </div>

            {/* Resumen de totales */}
            <div className="rounded-xl border bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span><span>{formatCurrency(subtotalOriginal)}</span>
              </div>
              {autoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento automático</span><span>−{formatCurrency(autoDiscount)}</span>
                </div>
              )}
              {couponAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Cupón {form.coupon_code.toUpperCase()}</span><span>−{formatCurrency(couponAmount)}</span>
                </div>
              )}
              {form.order_type === 'delivery' && Number(restaurant.delivery_fee) > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Costo de envío</span><span>{formatCurrency(Number(restaurant.delivery_fee))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1.5 border-t">
                <span>Total</span><span style={{ color: primaryColor }}>{formatCurrency(orderTotal)}</span>
              </div>
            </div>

            {/* Botones de pago */}
            <div className="space-y-2">
              {hasStripe && (
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#635BFF' }}
                  onClick={handleStripePayment}
                  disabled={loading || !form.customer_name.trim()}
                >
                  <CreditCard size={15} />
                  {loading ? 'Redirigiendo…' : `Pagar con tarjeta · ${formatCurrency(orderTotal)}`}
                </button>
              )}
              <button
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                style={!hasStripe ? { backgroundColor: primaryColor, color: 'white' } : { border: '1.5px solid #e2e8f0', color: '#334155' }}
                onClick={placeOrder}
                disabled={loading || !form.customer_name.trim()}
              >
                <Banknote size={15} />
                {loading ? 'Enviando…' : hasStripe ? 'Pagar al recibir' : `Hacer pedido · ${formatCurrency(orderTotal)}`}
              </button>
            </div>

            {hasStripe && (
              <p className="text-xs text-muted-foreground text-center">
                Pago seguro procesado por Stripe 🔒
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
