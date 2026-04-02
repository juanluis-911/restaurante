'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils/helpers'
import { ShoppingCart, Clock, Phone, Plus, Minus, X, Ticket, ArrowLeft, CreditCard, Lock, CheckCircle2 } from 'lucide-react'
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
}

export default function StorefrontClient({
  restaurant, isOpen, menus, categories, products, combos, discounts,
}: Props) {
  const [activeMenuId, setActiveMenuId] = useState(menus[0]?.id ?? null)
  const [cartOpen,     setCartOpen]     = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paymentOpen,  setPaymentOpen]  = useState(false)
  const [paymentStep,  setPaymentStep]  = useState<'form' | 'processing' | 'success'>('form')
  const [loading,      setLoading]      = useState(false)
  const [cardForm,     setCardForm]     = useState({ number: '', expiry: '', cvc: '', name: '' })

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

  // ── Descuentos automáticos ───────────────────────────────
  function getDiscountedPrice(product: Product): number {
    const d = discounts.find((d) =>
      d.is_active && (
        d.scope === 'all' ||
        (d.scope === 'product' && d.target_ids?.includes(product.id))
      )
    )
    if (!d) return Number(product.price)
    if (d.type === 'percentage') return Number(product.price) * (1 - Number(d.value) / 100)
    if (d.type === 'fixed')      return Math.max(0, Number(product.price) - Number(d.value))
    return Number(product.price)
  }

  // ── Totales ──────────────────────────────────────────────
  const subtotalOriginal = cart.items.reduce((s, i) => s + i.original_price * i.quantity, 0)
  const subtotalFinal    = cart.items.reduce((s, i) => s + i.price * i.quantity, 0)
  const autoDiscount     = subtotalOriginal - subtotalFinal

  const couponAmount = useMemo(() => {
    if (!couponDiscount) return 0
    if (couponDiscount.type === 'percentage')
      return subtotalFinal * (Number(couponDiscount.value) / 100)
    if (couponDiscount.type === 'fixed')
      return Math.min(Number(couponDiscount.value), subtotalFinal)
    return 0
  }, [couponDiscount, subtotalFinal])

  const totalDiscount = autoDiscount + couponAmount
  const orderTotal    = Math.max(0, subtotalOriginal - totalDiscount)

  // ── Cupón ────────────────────────────────────────────────
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
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast.error('Este cupón ya venció'); return
      }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast.error('Este cupón ya alcanzó su límite de usos'); return
      }
      setCouponDiscount(coupon.discounts as unknown as Discount)
      toast.success(`Cupón "${code}" aplicado`)
    } catch { toast.error('Error al validar el cupón') }
    finally { setCouponValidating(false) }
  }

  function removeCoupon() {
    setCouponDiscount(null)
    setForm((p) => ({ ...p, coupon_code: '' }))
  }

  // ── Abrir pago ───────────────────────────────────────────
  function openPayment() {
    if (!form.customer_name.trim()) { toast.error('Ingresa tu nombre'); return }
    if (cart.isEmpty) { toast.error('El carrito está vacío'); return }
    if (form.order_type === 'delivery') {
      if (!form.delivery_street.trim()) { toast.error('Ingresa tu calle y número'); return }
      if (!form.delivery_city.trim()) { toast.error('Ingresa tu ciudad'); return }
    }
    setCheckoutOpen(false)
    setCardForm({ number: '', expiry: '', cvc: '', name: '' })
    setPaymentStep('form')
    setPaymentOpen(true)
  }

  // ── Pago simulado → crear orden ──────────────────────────
  async function handlePayment() {
    const num = cardForm.number.replace(/\s/g, '')
    if (num.length < 16) { toast.error('Número de tarjeta inválido'); return }
    if (cardForm.expiry.length < 5) { toast.error('Fecha de vencimiento inválida'); return }
    if (cardForm.cvc.length < 3) { toast.error('CVC inválido'); return }
    if (!cardForm.name.trim()) { toast.error('Ingresa el nombre del titular'); return }

    setPaymentStep('processing')
    await new Promise((r) => setTimeout(r, 2200))

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
          restaurant_id:  restaurant.id,
          source:         'online',
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
          items,
          subtotal:       subtotalOriginal,
          discount_amount: totalDiscount,
          total:          orderTotal,
          status:         'received',
        })
        .select()
        .single()

      if (error) throw error

      if (couponDiscount) {
        const { data: c } = await supabase
          .from('coupons').select('used_count')
          .eq('code', form.coupon_code.toUpperCase())
          .eq('restaurant_id', restaurant.id).single()
        if (c) await supabase.from('coupons')
          .update({ used_count: c.used_count + 1 })
          .eq('code', form.coupon_code.toUpperCase())
          .eq('restaurant_id', restaurant.id)
      }

      setPaymentStep('success')
      cart.clearCart()
      await new Promise((r) => setTimeout(r, 1500))
      window.location.href = `/${restaurant.slug}/order/${order.id}`
    } catch {
      setPaymentStep('form')
      toast.error('Error al procesar el pago')
    }
  }

  function formatCardNumber(value: string) {
    return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2)
    return digits
  }

  // ── Checkout ─────────────────────────────────────────────
  async function placeOrder() {
    if (!form.customer_name.trim()) { toast.error('Ingresa tu nombre'); return }
    if (cart.isEmpty) { toast.error('El carrito está vacío'); return }
    if (form.order_type === 'delivery') {
      if (!form.delivery_street.trim()) { toast.error('Ingresa tu calle y número'); return }
      if (!form.delivery_city.trim()) { toast.error('Ingresa tu ciudad'); return }
    }
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
          restaurant_id:  restaurant.id,
          source:         'online',
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
          items,
          subtotal:       subtotalOriginal,
          discount_amount: totalDiscount,
          total:          orderTotal,
          status:         'received',
        })
        .select()
        .single()

      if (error) throw error

      // Incrementar usos del cupón
      if (couponDiscount) {
        const { data: c } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('code', form.coupon_code.toUpperCase())
          .eq('restaurant_id', restaurant.id)
          .single()
        if (c) {
          await supabase
            .from('coupons')
            .update({ used_count: c.used_count + 1 })
            .eq('code', form.coupon_code.toUpperCase())
            .eq('restaurant_id', restaurant.id)
        }
      }

      cart.clearCart()
      setCheckoutOpen(false)
      setCartOpen(false)
      window.location.href = `/${restaurant.slug}/order/${order.id}`
    } catch { toast.error('Error al enviar el pedido') }
    finally { setLoading(false) }
  }

  // ── UI ───────────────────────────────────────────────────
  const menuCategories = categories.filter((c) => c.menu_id === activeMenuId)

  return (
    <div className="min-h-screen bg-gray-50" style={{ '--color-primary': restaurant.primary_color } as React.CSSProperties}>

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
            <ArrowLeft size={13} />
            Todos los restaurantes
          </Link>
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: restaurant.primary_color }}>
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant={isOpen ? 'default' : 'secondary'}
                  className={`text-xs ${isOpen ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                  {isOpen ? 'Abierto' : 'Cerrado'}
                </Badge>
                {restaurant.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone size={10} /> {restaurant.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 text-white px-3 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: restaurant.primary_color }}>
            <ShoppingCart size={16} />
            {cart.totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cart.totalItems}
              </span>
            )}
            <span className="hidden sm:inline">{formatCurrency(cart.subtotal)}</span>
          </button>
          </div>
        </div>

        {menus.length > 1 && (
          <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
            {menus.map((menu) => (
              <button key={menu.id} onClick={() => setActiveMenuId(menu.id)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${activeMenuId === menu.id ? 'text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={activeMenuId === menu.id ? { backgroundColor: restaurant.primary_color } : {}}>
                {menu.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Aviso cerrado */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {!isOpen && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Clock size={18} className="text-orange-500 shrink-0" />
            <p className="text-sm text-orange-800">
              El restaurante está cerrado en este momento. Puedes ver el menú pero no realizar pedidos.
            </p>
          </div>
        )}

        {/* Categorías */}
        {menuCategories.map((category) => {
          const catProducts = products.filter((p) => p.category_id === category.id && p.is_active)
          if (catProducts.length === 0) return null
          return (
            <section key={category.id} className="mb-8">
              <h2 className="text-lg font-bold mb-3 pb-2 border-b">{category.name}</h2>
              <div className="space-y-3">
                {catProducts.map((product) => {
                  const discountedPrice = getDiscountedPrice(product)
                  const hasDiscount    = discountedPrice < Number(product.price)
                  const inCart         = cart.items.find((i) => i.id === product.id)

                  return (
                    <div key={product.id} className="bg-white rounded-xl border p-3 flex gap-3 hover:shadow-sm transition-shadow">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name}
                          className="w-20 h-20 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p className="font-semibold">{product.name}</p>
                          {product.is_featured && (
                            <Badge className="text-xs shrink-0" style={{ backgroundColor: restaurant.primary_color }}>
                              Destacado
                            </Badge>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div>
                            <span className="font-bold" style={{ color: restaurant.primary_color }}>
                              {formatCurrency(discountedPrice)}
                            </span>
                            {hasDiscount && (
                              <span className="text-sm text-muted-foreground line-through ml-2">
                                {formatCurrency(Number(product.price))}
                              </span>
                            )}
                          </div>
                          {inCart ? (
                            <div className="flex items-center gap-2">
                              <button className="w-7 h-7 rounded border flex items-center justify-center hover:bg-muted"
                                onClick={() => cart.updateQuantity(product.id, 'product', inCart.quantity - 1)}>
                                <Minus size={12} />
                              </button>
                              <span className="font-semibold text-sm w-4 text-center">{inCart.quantity}</span>
                              <button className="w-7 h-7 rounded flex items-center justify-center text-white"
                                style={{ backgroundColor: restaurant.primary_color }}
                                onClick={() => cart.updateQuantity(product.id, 'product', inCart.quantity + 1)}>
                                <Plus size={12} />
                              </button>
                            </div>
                          ) : (
                            <Button size="sm" className="h-7 text-xs"
                              style={{ backgroundColor: restaurant.primary_color }}
                              onClick={() => cart.addItem({
                                id: product.id, type: 'product', name: product.name,
                                price: discountedPrice, original_price: Number(product.price),
                                image_url: product.image_url,
                              })}>
                              <Plus size={13} className="mr-1" /> Agregar
                            </Button>
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

        {/* Combos */}
        {combos.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-2 border-b flex items-center gap-2">
              Combos <Badge variant="secondary" className="text-xs">Ahorra más</Badge>
            </h2>
            <div className="space-y-3">
              {combos.map((combo) => {
                const inCart = cart.items.find((i) => i.id === combo.id)
                return (
                  <div key={combo.id} className="bg-white rounded-xl border-2 p-3 flex gap-3 hover:shadow-sm transition-shadow"
                    style={{ borderColor: restaurant.primary_color + '40' }}>
                    {combo.image_url && (
                      <img src={combo.image_url} alt={combo.name}
                        className="w-20 h-20 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{combo.name}</p>
                        <Badge className="text-xs" style={{ backgroundColor: restaurant.primary_color }}>Combo</Badge>
                      </div>
                      {combo.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{combo.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold" style={{ color: restaurant.primary_color }}>
                          {formatCurrency(Number(combo.price))}
                        </span>
                        {inCart ? (
                          <div className="flex items-center gap-2">
                            <button className="w-7 h-7 rounded border flex items-center justify-center hover:bg-muted"
                              onClick={() => cart.updateQuantity(combo.id, 'combo', inCart.quantity - 1)}>
                              <Minus size={12} />
                            </button>
                            <span className="font-semibold text-sm w-4 text-center">{inCart.quantity}</span>
                            <button className="w-7 h-7 rounded flex items-center justify-center text-white"
                              style={{ backgroundColor: restaurant.primary_color }}
                              onClick={() => cart.updateQuantity(combo.id, 'combo', inCart.quantity + 1)}>
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <Button size="sm" className="h-7 text-xs"
                            style={{ backgroundColor: restaurant.primary_color }}
                            onClick={() => cart.addItem({
                              id: combo.id, type: 'combo', name: combo.name,
                              price: Number(combo.price), original_price: Number(combo.price),
                              image_url: combo.image_url,
                            })}>
                            <Plus size={13} className="mr-1" /> Agregar
                          </Button>
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

      {/* FAB mobile */}
      {cart.totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 sm:hidden">
          <button onClick={() => setCartOpen(true)}
            className="shadow-xl flex items-center gap-2 px-5 py-3 rounded-full text-white text-sm font-medium"
            style={{ backgroundColor: restaurant.primary_color }}>
            <ShoppingCart size={16} />
            Ver carrito · {formatCurrency(cart.subtotal)}
            <Badge variant="secondary" className="ml-1 text-xs">{cart.totalItems}</Badge>
          </button>
        </div>
      )}

      {/* ── Dialog: Carrito ──────────────────────────────── */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tu pedido</DialogTitle></DialogHeader>
          {cart.isEmpty ? (
            <p className="text-muted-foreground text-center py-8">El carrito está vacío</p>
          ) : (
            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="w-6 h-6 rounded border flex items-center justify-center hover:bg-muted"
                      onClick={() => cart.updateQuantity(item.id, item.type, item.quantity - 1)}>
                      {item.quantity === 1 ? <X size={11} /> : <Minus size={11} />}
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                    <button className="w-6 h-6 rounded flex items-center justify-center text-white"
                      style={{ backgroundColor: restaurant.primary_color }}
                      onClick={() => cart.updateQuantity(item.id, item.type, item.quantity + 1)}>
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="text-sm font-bold w-16 text-right shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-bold text-base">
                <span>Total</span><span>{formatCurrency(cart.subtotal)}</span>
              </div>
              <Button className="w-full" style={{ backgroundColor: restaurant.primary_color }}
                onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>
                Continuar con el pedido →
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Checkout ─────────────────────────────── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Datos del pedido</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Tu nombre *</Label>
              <Input placeholder="¿Cómo te llamamos?" value={form.customer_name}
                onChange={(e) => setForm((p) => ({ ...p, customer_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input type="tel" placeholder="644 123 4567" value={form.customer_phone}
                onChange={(e) => setForm((p) => ({ ...p, customer_phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de pedido</Label>
              <div className="flex gap-2">
                {(['pickup', 'dine_in', ...(restaurant.delivery_enabled ? ['delivery' as const] : [])] as const).map((t) => (
                  <button key={t} onClick={() => setForm((p) => ({ ...p, order_type: t }))}
                    className={`flex-1 text-sm py-2 rounded border transition-colors ${form.order_type === t ? 'text-white' : 'hover:bg-muted'}`}
                    style={form.order_type === t ? { backgroundColor: restaurant.primary_color } : {}}>
                    {t === 'dine_in' ? '🍽 Mesa' : t === 'pickup' ? '🛍 Recoger' : '🛵 Domicilio'}
                  </button>
                ))}
              </div>
            </div>
            {/* Dirección de entrega — solo cuando es delivery */}
            {form.order_type === 'delivery' && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <p className="text-sm font-medium">Dirección de entrega</p>
                <div className="space-y-2">
                  <Label className="text-xs">Calle y número *</Label>
                  <Input placeholder="Av. Reforma 123" value={form.delivery_street}
                    onChange={(e) => setForm((p) => ({ ...p, delivery_street: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Colonia</Label>
                  <Input placeholder="Col. Centro" value={form.delivery_neighborhood}
                    onChange={(e) => setForm((p) => ({ ...p, delivery_neighborhood: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Ciudad *</Label>
                  <Input placeholder="Hermosillo" value={form.delivery_city}
                    onChange={(e) => setForm((p) => ({ ...p, delivery_city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Referencias</Label>
                  <Input placeholder="Casa azul, portón negro..." value={form.delivery_references}
                    onChange={(e) => setForm((p) => ({ ...p, delivery_references: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input placeholder="Sin cebolla, extra salsa..." value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            {/* Cupón */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Ticket size={14} /> Cupón de descuento</Label>
              {couponDiscount ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
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

            {/* Resumen */}
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span><span>{formatCurrency(subtotalOriginal)}</span>
              </div>
              {autoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento automático</span><span>-{formatCurrency(autoDiscount)}</span>
                </div>
              )}
              {couponAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Cupón {form.coupon_code.toUpperCase()}</span><span>-{formatCurrency(couponAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1.5 border-t">
                <span>Total</span><span>{formatCurrency(orderTotal)}</span>
              </div>
            </div>

            <Button className="w-full" style={{ backgroundColor: restaurant.primary_color }}
              onClick={openPayment} disabled={!form.customer_name.trim()}>
              Continuar al pago →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Dialog: Pago simulado (Stripe) ───────────────── */}
      <Dialog open={paymentOpen} onOpenChange={(o) => { if (paymentStep === 'form') setPaymentOpen(o) }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">

          {/* Header estilo Stripe */}
          <div className="px-6 pt-6 pb-4 border-b bg-slate-50">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-slate-500" />
                <span className="text-xs text-slate-500 font-medium">Pago seguro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-5 bg-blue-600 rounded text-white text-[9px] font-bold flex items-center justify-center">VISA</div>
                <div className="w-8 h-5 bg-red-500 rounded text-white text-[9px] font-bold flex items-center justify-center">MC</div>
                <div className="w-8 h-5 bg-blue-400 rounded text-white text-[9px] font-bold flex items-center justify-center">AMEX</div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-sm text-slate-600">{restaurant.name}</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(orderTotal)}</p>
              </div>
              <CreditCard size={28} className="text-slate-400" />
            </div>
          </div>

          <div className="px-6 py-5">
            {paymentStep === 'success' ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 size={52} className="text-green-500" />
                <p className="font-bold text-lg text-slate-800">¡Pago aprobado!</p>
                <p className="text-sm text-slate-500">Redirigiendo a tu pedido…</p>
              </div>
            ) : paymentStep === 'processing' ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-600 font-medium">Procesando pago…</p>
                <p className="text-xs text-slate-400">No cierres esta ventana</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Número de tarjeta</label>
                  <div className="relative">
                    <Input
                      placeholder="1234 5678 9012 3456"
                      value={cardForm.number}
                      onChange={(e) => setCardForm((p) => ({ ...p, number: formatCardNumber(e.target.value) }))}
                      className="font-mono pr-10"
                      maxLength={19}
                      inputMode="numeric"
                    />
                    <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Vencimiento</label>
                    <Input
                      placeholder="MM/AA"
                      value={cardForm.expiry}
                      onChange={(e) => setCardForm((p) => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                      className="font-mono"
                      maxLength={5}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">CVC</label>
                    <Input
                      placeholder="123"
                      value={cardForm.cvc}
                      onChange={(e) => setCardForm((p) => ({ ...p, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      className="font-mono"
                      maxLength={4}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Nombre del titular</label>
                  <Input
                    placeholder="Como aparece en la tarjeta"
                    value={cardForm.name}
                    onChange={(e) => setCardForm((p) => ({ ...p, name: e.target.value.toUpperCase() }))}
                    className="uppercase"
                  />
                </div>

                <Button
                  className="w-full mt-2 gap-2"
                  style={{ backgroundColor: '#635BFF' }}
                  onClick={handlePayment}
                >
                  <Lock size={14} />
                  Pagar {formatCurrency(orderTotal)}
                </Button>

                <button
                  className="w-full text-xs text-slate-400 hover:text-slate-600 text-center"
                  onClick={() => { setPaymentOpen(false); setCheckoutOpen(true) }}
                >
                  ← Volver al pedido
                </button>
              </div>
            )}
          </div>

          {/* Footer Stripe */}
          <div className="px-6 pb-4 flex items-center justify-center gap-1.5">
            <Lock size={11} className="text-slate-400" />
            <span className="text-[11px] text-slate-400">Pagos seguros con</span>
            <span className="text-[11px] font-bold text-slate-500">stripe</span>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
