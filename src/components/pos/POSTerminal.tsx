'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Minus, Trash2, CreditCard, Banknote, Smartphone } from 'lucide-react'
import type { Database } from '@/types/database'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Product = Database['public']['Tables']['products']['Row']
type Combo = Database['public']['Tables']['combos']['Row']
type PosSession = Database['public']['Tables']['pos_sessions']['Row']

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  type: 'product' | 'combo'
}

interface Props {
  restaurant: Restaurant
  menus: { id: string; name: string }[]
  products: Product[]
  combos: Combo[]
  openSession: PosSession | null
  userId: string
}

export default function POSTerminal({ restaurant, products, combos, openSession, userId }: Props) {
  const [session, setSession] = useState<PosSession | null>(openSession)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'dine_in' | 'pickup' | 'delivery'>('dine_in')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [payDialog, setPayDialog] = useState(false)
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [sessionDialog, setSessionDialog] = useState(!openSession)
  const [openingCash, setOpeningCash] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const change = payMethod === 'cash' ? Math.max(0, parseFloat(cashReceived || '0') - total) : 0
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

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

  async function openSession_() {
    if (!openingCash) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('pos_sessions')
        .insert({
          restaurant_id: restaurant.id,
          user_id: userId,
          opening_cash: parseFloat(openingCash),
          status: 'open',
        })
        .select()
        .single()
      if (error) throw error
      setSession(data)
      setSessionDialog(false)
      toast.success('Caja abierta')
    } catch { toast.error('Error al abrir caja') }
    finally { setLoading(false) }
  }

  async function checkout() {
    if (!customerName.trim()) { toast.error('Ingresa el nombre del cliente'); return }
    if (cart.length === 0) { toast.error('El carrito está vacío'); return }
    if (!session) { toast.error('Abre la caja primero'); return }
    setLoading(true)
    try {
      const items = cart.map((i) => ({
        ...(i.type === 'product' ? { product_id: i.id } : { combo_id: i.id }),
        name: i.name, quantity: i.quantity, unit_price: i.price,
        subtotal: i.price * i.quantity, discount_amount: 0,
      }))

      // Crear orden
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          source: 'pos',
          order_type: orderType,
          customer_name: customerName,
          table_number: tableNumber || null,
          items,
          subtotal: total,
          total,
          discount_amount: 0,
          status: 'received',
          pos_session_id: session.id,
        })
        .select()
        .single()
      if (orderError) throw orderError

      // Registrar pago
      await supabase.from('pos_transactions').insert({
        pos_session_id: session.id,
        order_id: order.id,
        restaurant_id: restaurant.id,
        payment_method: payMethod,
        amount: total,
        change_amount: change,
      })

      // Actualizar total de sesión
      await supabase
        .from('pos_sessions')
        .update({ total_sales: (session.total_sales ?? 0) + total })
        .eq('id', session.id)

      toast.success(`Cobro registrado ✓ ${payMethod === 'cash' && change > 0 ? `Cambio: ${fmt(change)}` : ''}`)
      setCart([])
      setCustomerName('')
      setTableNumber('')
      setPayDialog(false)
    } catch { toast.error('Error al procesar el pago') }
    finally { setLoading(false) }
  }

  async function closeSession() {
    if (!session) return
    if (!confirm('¿Cerrar la caja? Se calculará el total de ventas del turno.')) return
    await supabase.from('pos_sessions').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', session.id)
    setSession(null)
    setSessionDialog(true)
    toast.success('Caja cerrada')
  }

  return (
    <>
      {/* Dialog abrir caja */}
      <Dialog open={sessionDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir caja</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Monto inicial en efectivo</Label>
              <Input type="number" min="0" placeholder="0.00" value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)} autoFocus />
            </div>
            <Button className="w-full" onClick={openSession_} disabled={loading || !openingCash}>
              {loading ? 'Abriendo...' : 'Abrir caja'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Productos */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold">POS</h1>
            {session && (
              <Button variant="outline" size="sm" onClick={closeSession}>Cerrar caja</Button>
            )}
          </div>

          {combos.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Combos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {combos.map((c) => (
                  <button key={c.id} onClick={() => addToCart({ id: c.id, name: c.name, price: Number(c.price) }, 'combo')}
                    className="text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <Badge variant="secondary" className="mb-1 text-xs">Combo</Badge>
                    <p className="text-sm font-medium leading-tight">{c.name}</p>
                    <p className="text-sm font-bold mt-1">{fmt(Number(c.price))}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Productos</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {products.map((p) => (
              <button key={p.id} onClick={() => addToCart({ id: p.id, name: p.name, price: Number(p.price) }, 'product')}
                className="text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <p className="text-sm font-medium leading-tight">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                <p className="text-sm font-bold mt-1">{fmt(Number(p.price))}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Carrito */}
        <div className="w-80 flex flex-col border-l pl-4">
          <div className="mb-3">
            <p className="text-sm font-medium mb-2">Tipo de orden</p>
            <div className="flex gap-1">
              {(['dine_in', 'pickup', 'delivery'] as const).map((t) => (
                <button key={t} onClick={() => setOrderType(t)}
                  className={`flex-1 text-xs py-1.5 rounded border transition-colors ${orderType === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
                  {t === 'dine_in' ? 'Mesa' : t === 'pickup' ? 'Llevar' : 'Delivery'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <Label className="text-xs">Cliente *</Label>
              <Input className="h-8 text-sm mt-1" value={customerName}
                onChange={(e) => setCustomerName(e.target.value)} placeholder="Nombre" />
            </div>
            {orderType === 'dine_in' && (
              <div>
                <Label className="text-xs">Mesa</Label>
                <Input className="h-8 text-sm mt-1" value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)} placeholder="#" />
              </div>
            )}
          </div>

          {/* Items del carrito */}
          <div className="flex-1 overflow-y-auto space-y-1 mb-3">
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Carrito vacío</p>
            )}
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded border p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{fmt(item.price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateQty(item.id, -1)}>
                    {item.quantity === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                  </Button>
                  <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => updateQty(item.id, 1)}>
                    <Plus size={11} />
                  </Button>
                </div>
                <span className="text-xs font-bold w-14 text-right">{fmt(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Total y cobro */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
            <Button className="w-full" disabled={cart.length === 0 || !customerName} onClick={() => setPayDialog(true)}>
              Cobrar {fmt(total)}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog pago */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar pago — {fmt(total)}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { method: 'cash' as const, label: 'Efectivo', icon: Banknote },
                { method: 'card' as const, label: 'Tarjeta', icon: CreditCard },
                { method: 'transfer' as const, label: 'Transferencia', icon: Smartphone },
              ].map(({ method, label, icon: Icon }) => (
                <button key={method} onClick={() => setPayMethod(method)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${payMethod === method ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                  <Icon size={18} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>

            {payMethod === 'cash' && (
              <div className="space-y-2">
                <Label>Efectivo recibido</Label>
                <Input type="number" min={total} step="0.50" value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)} autoFocus />
                {parseFloat(cashReceived) >= total && (
                  <p className="text-sm font-medium text-green-600">Cambio: {fmt(change)}</p>
                )}
              </div>
            )}

            <Button className="w-full" onClick={checkout} disabled={loading ||
              (payMethod === 'cash' && parseFloat(cashReceived || '0') < total)}>
              {loading ? 'Procesando...' : `Confirmar cobro ${fmt(total)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
