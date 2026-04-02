'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ShoppingCart, Plus, Minus, X } from 'lucide-react'
import type { Database } from '@/types/database'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Product = Database['public']['Tables']['products']['Row']
type Discount = Database['public']['Tables']['discounts']['Row']

interface CartItem extends Product { quantity: number }

interface Props {
  restaurant: Restaurant
  menus: Array<{
    id: string; name: string
    categories: Array<{ id: string; name: string; is_active: boolean; products: Product[] }>
  }>
  hours: Database['public']['Tables']['restaurant_hours']['Row'][]
  discounts: Discount[]
}

export default function StorefrontMenu({ restaurant, menus, discounts }: Props) {
  const [activeMenu, setActiveMenu] = useState(menus[0]?.id ?? '')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    order_type: 'pickup' as 'dine_in' | 'pickup' | 'delivery',
    notes: '', coupon_code: '',
  })
  const [couponDiscount, setCouponDiscount] = useState<Discount | null>(null)
  const [couponValidating, setCouponValidating] = useState(false)

  const currentMenu = menus.find((m) => m.id === activeMenu)
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  function getDiscountedPrice(product: Product): number {
    const applicable = discounts.find((d) =>
      d.is_active && (
        d.scope === 'all' ||
        (d.scope === 'product' && d.target_ids.includes(product.id))
      )
    )
    if (!applicable) return Number(product.price)
    if (applicable.type === 'percentage') return Number(product.price) * (1 - Number(applicable.value) / 100)
    if (applicable.type === 'fixed') return Math.max(0, Number(product.price) - Number(applicable.value))
    return Number(product.price)
  }

  const cartSubtotal = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
  const cartDiscounted = cart.reduce((s, i) => s + getDiscountedPrice(i) * i.quantity, 0)
  const autoDiscountAmount = cartSubtotal - cartDiscounted

  const couponAmount = useMemo(() => {
    if (!couponDiscount) return 0
    if (couponDiscount.type === 'percentage')
      return cartDiscounted * (Number(couponDiscount.value) / 100)
    if (couponDiscount.type === 'fixed')
      return Math.min(Number(couponDiscount.value), cartDiscounted)
    return 0
  }, [couponDiscount, cartDiscounted])

  const totalDiscount = autoDiscountAmount + couponAmount
  const cartTotal = Math.max(0, cartSubtotal - totalDiscount)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  function addToCart(product: Product) {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === product.id)
      if (exists) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...product, quantity: 1 }]
    })
    toast.success(`${product.name} agregado`)
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter((i) => i.quantity > 0)
    )
  }

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

      const discount = coupon.discounts as unknown as Discount
      setCouponDiscount(discount)
      toast.success(`Cupón "${code}" aplicado`)
    } catch { toast.error('Error al validar el cupón') }
    finally { setCouponValidating(false) }
  }

  function removeCoupon() {
    setCouponDiscount(null)
    setForm((p) => ({ ...p, coupon_code: '' }))
  }

  async function placeOrder() {
    if (!form.customer_name.trim()) { toast.error('Ingresa tu nombre'); return }
    setLoading(true)
    try {
      const items = cart.map((i) => ({
        product_id: i.id, name: i.name, quantity: i.quantity,
        unit_price: getDiscountedPrice(i), subtotal: getDiscountedPrice(i) * i.quantity,
      }))

      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          source: 'online',
          order_type: form.order_type,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email || null,
          notes: form.notes || null,
          coupon_code: couponDiscount ? form.coupon_code.toUpperCase() : null,
          items,
          subtotal: cartSubtotal,
          discount_amount: totalDiscount,
          total: cartTotal,
          status: 'received',
        })
        .select()
        .single()

      if (error) throw error

      // Incrementar contador de usos del cupón
      if (couponDiscount) {
        const { data: coup } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('code', form.coupon_code.toUpperCase())
          .eq('restaurant_id', restaurant.id)
          .single()
        if (coup) {
          await supabase
            .from('coupons')
            .update({ used_count: coup.used_count + 1 })
            .eq('code', form.coupon_code.toUpperCase())
            .eq('restaurant_id', restaurant.id)
        }
      }

      setCart([])
      setCouponDiscount(null)
      setCheckoutOpen(false)
      toast.success('¡Pedido enviado! Te notificaremos cuando esté listo.')
      window.location.href = `/${restaurant.slug}/order/${order.id}`
    } catch { toast.error('Error al enviar el pedido') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ '--color-primary': restaurant.primary_color } as React.CSSProperties}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{restaurant.name}</h1>
            {restaurant.phone && <p className="text-xs text-muted-foreground">{restaurant.phone}</p>}
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: restaurant.primary_color }}
          >
            <ShoppingCart size={16} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
            {fmt(cartTotal)}
          </button>
        </div>

        {/* Tabs de menús */}
        {menus.length > 1 && (
          <div className="max-w-3xl mx-auto px-4 flex gap-2 pb-2 overflow-x-auto">
            {menus.map((m) => (
              <button key={m.id} onClick={() => setActiveMenu(m.id)}
                className={`text-sm px-3 py-1 rounded-full whitespace-nowrap transition-colors ${activeMenu === m.id ? 'text-white' : 'bg-muted text-muted-foreground'}`}
                style={activeMenu === m.id ? { backgroundColor: restaurant.primary_color } : {}}>
                {m.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Productos */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {currentMenu?.categories.filter((c) => c.is_active && c.products.length > 0).map((cat) => (
          <section key={cat.id}>
            <h2 className="font-bold text-lg mb-3">{cat.name}</h2>
            <div className="grid gap-3">
              {cat.products.filter((p) => p.is_active).map((product) => {
                const discounted = getDiscountedPrice(product)
                const hasDiscount = discounted < Number(product.price)
                const inCart = cart.find((i) => i.id === product.id)

                return (
                  <div key={product.id} className="flex gap-3 border rounded-xl p-3 hover:shadow-sm transition-shadow">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name}
                        className="w-20 h-20 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className="font-medium">{product.name}</p>
                        {product.is_featured && <Badge className="text-xs shrink-0">Destacado</Badge>}
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <span className="font-bold text-base">{fmt(discounted)}</span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through ml-2">{fmt(Number(product.price))}</span>
                          )}
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(product.id, -1)}>
                              <Minus size={12} />
                            </Button>
                            <span className="font-medium text-sm w-4 text-center">{inCart.quantity}</span>
                            <Button size="sm" className="h-7 w-7 p-0" onClick={() => updateQty(product.id, 1)}
                              style={{ backgroundColor: restaurant.primary_color }}>
                              <Plus size={12} />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => addToCart(product)}
                            style={{ backgroundColor: restaurant.primary_color }} className="text-white">
                            <Plus size={14} className="mr-1" /> Agregar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Carrito sidebar */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tu pedido</DialogTitle></DialogHeader>
          {cart.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">El carrito está vacío</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt(getDiscountedPrice(item))} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateQty(item.id, -1)}>
                      {item.quantity === 1 ? <X size={12} /> : <Minus size={12} />}
                    </Button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateQty(item.id, 1)}>
                      <Plus size={12} />
                    </Button>
                  </div>
                  <span className="text-sm font-bold w-16 text-right">{fmt(getDiscountedPrice(item) * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>Total</span>
                <span>{fmt(cartTotal)}</span>
              </div>
              <Button className="w-full" style={{ backgroundColor: restaurant.primary_color }}
                onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>
                Continuar con el pedido →
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent>
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
                {(['pickup', 'dine_in', ...(restaurant.delivery_enabled ? ['delivery'] : [])] as const).map((t) => (
                  <button key={t} onClick={() => setForm((p) => ({ ...p, order_type: t as 'dine_in' | 'pickup' | 'delivery' }))}
                    className={`flex-1 text-sm py-2 rounded border transition-colors ${form.order_type === t ? 'text-white' : 'hover:bg-muted'}`}
                    style={form.order_type === t ? { backgroundColor: restaurant.primary_color } : {}}>
                    {t === 'dine_in' ? 'Mesa' : t === 'pickup' ? 'Recoger' : 'Domicilio'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input placeholder="Sin cebolla, extra salsa..." value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            {/* Cupón */}
            <div className="space-y-2">
              <Label>Código de cupón</Label>
              {couponDiscount ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-green-700">{form.coupon_code.toUpperCase()}</p>
                    <p className="text-xs text-green-600">
                      {couponDiscount.type === 'percentage'
                        ? `${couponDiscount.value}% de descuento`
                        : `${fmt(Number(couponDiscount.value))} de descuento`}
                    </p>
                  </div>
                  <button onClick={removeCoupon} className="text-green-600 hover:text-green-800">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="CODIGO123"
                    value={form.coupon_code}
                    onChange={(e) => setForm((p) => ({ ...p, coupon_code: e.target.value.toUpperCase() }))}
                    className="font-mono uppercase"
                  />
                  <Button variant="outline" onClick={validateCoupon}
                    disabled={couponValidating || !form.coupon_code.trim()}>
                    {couponValidating ? '...' : 'Aplicar'}
                  </Button>
                </div>
              )}
            </div>

            {/* Resumen de precios */}
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span><span>{fmt(cartSubtotal)}</span>
              </div>
              {autoDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento automático</span><span>-{fmt(autoDiscountAmount)}</span>
                </div>
              )}
              {couponAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Cupón {form.coupon_code.toUpperCase()}</span><span>-{fmt(couponAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>Total</span><span>{fmt(cartTotal)}</span>
              </div>
            </div>

            <Button className="w-full" style={{ backgroundColor: restaurant.primary_color }}
              onClick={placeOrder} disabled={loading || !form.customer_name}>
              {loading ? 'Enviando...' : `Confirmar pedido ${fmt(cartTotal)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
