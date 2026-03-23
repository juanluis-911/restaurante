'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Tag, Ticket } from 'lucide-react'
import type { Database } from '@/types/database'

type Discount = Database['public']['Tables']['discounts']['Row']
type Coupon = Database['public']['Tables']['coupons']['Row'] & {
  discounts: { name: string } | null
}

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

interface Props {
  initialDiscounts: Discount[]
  initialCoupons: Coupon[]
  restaurantId: string
}

export default function DiscountsList({ initialDiscounts, initialCoupons, restaurantId }: Props) {
  const [discounts, setDiscounts] = useState<Discount[]>(initialDiscounts)
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [discDialog, setDiscDialog] = useState(false)
  const [couponDialog, setCouponDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const [discForm, setDiscForm] = useState({
    name: '', type: 'percentage', value: '', scope: 'all',
    expires_at: '', max_uses: '',
  })

  const [couponForm, setCouponForm] = useState({
    code: randomCode(), discount_id: '', usage_type: 'single_use',
    max_uses: '', expires_at: '',
  })

  async function saveDiscount() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('discounts')
        .insert({
          restaurant_id: restaurantId,
          name: discForm.name,
          type: discForm.type as Discount['type'],
          value: parseFloat(discForm.value),
          scope: discForm.scope as Discount['scope'],
          expires_at: discForm.expires_at || null,
          max_uses: discForm.max_uses ? parseInt(discForm.max_uses) : null,
        })
        .select()
        .single()
      if (error) throw error
      setDiscounts((p) => [data, ...p])
      setDiscDialog(false)
      toast.success('Descuento creado')
    } catch { toast.error('Error al crear descuento') }
    finally { setLoading(false) }
  }

  async function saveCoupon() {
    if (!couponForm.discount_id) { toast.error('Selecciona un descuento'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert({
          restaurant_id: restaurantId,
          code: couponForm.code,
          discount_id: couponForm.discount_id,
          usage_type: couponForm.usage_type as Coupon['usage_type'],
          max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : null,
          expires_at: couponForm.expires_at || null,
        })
        .select('*, discounts(name)')
        .single()
      if (error) throw error
      setCoupons((p) => [data as Coupon, ...p])
      setCouponDialog(false)
      toast.success('Cupón creado')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      toast.error(msg.includes('unique') ? 'Ese código ya existe' : 'Error al crear cupón')
    }
    finally { setLoading(false) }
  }

  async function toggleDiscount(d: Discount) {
    await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id)
    setDiscounts((p) => p.map((x) => x.id === d.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function deleteDiscount(d: Discount) {
    if (!confirm('¿Eliminar este descuento?')) return
    await supabase.from('discounts').delete().eq('id', d.id)
    setDiscounts((p) => p.filter((x) => x.id !== d.id))
    toast.success('Descuento eliminado')
  }

  async function toggleCoupon(c: Coupon) {
    await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id)
    setCoupons((p) => p.map((x) => x.id === c.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function deleteCoupon(c: Coupon) {
    if (!confirm('¿Eliminar este cupón?')) return
    await supabase.from('coupons').delete().eq('id', c.id)
    setCoupons((p) => p.filter((x) => x.id !== c.id))
    toast.success('Cupón eliminado')
  }

  const SCOPE_LABEL: Record<string, string> = {
    all: 'Todo el menú', category: 'Categoría', product: 'Producto', combo: 'Combo'
  }
  const TYPE_LABEL: Record<string, string> = {
    percentage: '%', fixed: '$', combo_price: 'Precio combo'
  }
  const USAGE_LABEL: Record<string, string> = {
    single_use: 'Uso único', per_user: 'Por usuario', until_date: 'Hasta fecha', unlimited: 'Ilimitado'
  }

  return (
    <Tabs defaultValue="discounts">
      <TabsList>
        <TabsTrigger value="discounts">
          <Tag size={14} className="mr-2" /> Descuentos automáticos
        </TabsTrigger>
        <TabsTrigger value="coupons">
          <Ticket size={14} className="mr-2" /> Cupones con código
        </TabsTrigger>
      </TabsList>

      {/* ── DESCUENTOS ── */}
      <TabsContent value="discounts" className="space-y-4 mt-4">
        <div className="flex justify-end">
          <Button onClick={() => setDiscDialog(true)}>
            <Plus size={16} className="mr-2" /> Nuevo descuento
          </Button>
        </div>

        {discounts.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin descuentos configurados</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {discounts.map((d) => (
              <Card key={d.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch checked={d.is_active} onCheckedChange={() => toggleDiscount(d)} />
                      <div>
                        <p className="font-medium text-sm">{d.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {d.type === 'percentage' ? `${d.value}% off` : `$${d.value} off`}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{SCOPE_LABEL[d.scope]}</Badge>
                          {d.expires_at && (
                            <Badge variant="outline" className="text-xs">
                              Vence {new Date(d.expires_at).toLocaleDateString('es-MX')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.max_uses && (
                        <span className="text-xs text-muted-foreground">{d.current_uses}/{d.max_uses} usos</span>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteDiscount(d)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── CUPONES ── */}
      <TabsContent value="coupons" className="space-y-4 mt-4">
        <div className="flex justify-end">
          <Button onClick={() => { setCouponForm((p) => ({ ...p, code: randomCode() })); setCouponDialog(true) }}>
            <Plus size={16} className="mr-2" /> Nuevo cupón
          </Button>
        </div>

        {coupons.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Sin cupones creados</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch checked={c.is_active} onCheckedChange={() => toggleCoupon(c)} />
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-bold text-sm bg-muted px-2 py-0.5 rounded">{c.code}</code>
                          <Badge variant="secondary" className="text-xs">{USAGE_LABEL[c.usage_type]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Descuento: {c.discounts?.name ?? '—'}
                          {c.expires_at && ` · Vence ${new Date(c.expires_at).toLocaleDateString('es-MX')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{c.used_count} usos</span>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteCoupon(c)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Dialog Descuento */}
      <Dialog open={discDialog} onOpenChange={setDiscDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo descuento</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Promoción de verano" value={discForm.name}
                onChange={(e) => setDiscForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select value={discForm.type} onChange={(e) => setDiscForm((p) => ({ ...p, type: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo ($)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Valor {discForm.type === 'percentage' ? '(%)' : '($)'}</Label>
                <Input type="number" min="0" value={discForm.value}
                  onChange={(e) => setDiscForm((p) => ({ ...p, value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alcance</Label>
                <select value={discForm.scope} onChange={(e) => setDiscForm((p) => ({ ...p, scope: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="all">Todo el menú</option>
                  <option value="category">Categoría específica</option>
                  <option value="product">Producto específico</option>
                  <option value="combo">Combo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Usos máximos</Label>
                <Input type="number" min="0" placeholder="Ilimitado" value={discForm.max_uses}
                  onChange={(e) => setDiscForm((p) => ({ ...p, max_uses: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de vencimiento</Label>
              <Input type="datetime-local" value={discForm.expires_at}
                onChange={(e) => setDiscForm((p) => ({ ...p, expires_at: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDiscDialog(false)}>Cancelar</Button>
              <Button onClick={saveDiscount} disabled={loading || !discForm.name || !discForm.value}>
                {loading ? 'Guardando...' : 'Crear descuento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Cupón */}
      <Dialog open={couponDialog} onOpenChange={setCouponDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo cupón</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Código</Label>
              <div className="flex gap-2">
                <Input value={couponForm.code} onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="font-mono uppercase" />
                <Button variant="outline" type="button" onClick={() => setCouponForm((p) => ({ ...p, code: randomCode() }))}>
                  Generar
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descuento a aplicar</Label>
              <select value={couponForm.discount_id} onChange={(e) => setCouponForm((p) => ({ ...p, discount_id: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Seleccionar descuento...</option>
                {discounts.filter((d) => d.is_active).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de uso</Label>
                <select value={couponForm.usage_type} onChange={(e) => setCouponForm((p) => ({ ...p, usage_type: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="single_use">Un solo uso</option>
                  <option value="per_user">Un uso por usuario</option>
                  <option value="until_date">Hasta fecha</option>
                  <option value="unlimited">Ilimitado</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Usos máximos</Label>
                <Input type="number" min="0" placeholder="Ilimitado" value={couponForm.max_uses}
                  onChange={(e) => setCouponForm((p) => ({ ...p, max_uses: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de vencimiento</Label>
              <Input type="datetime-local" value={couponForm.expires_at}
                onChange={(e) => setCouponForm((p) => ({ ...p, expires_at: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCouponDialog(false)}>Cancelar</Button>
              <Button onClick={saveCoupon} disabled={loading || !couponForm.code}>
                {loading ? 'Guardando...' : 'Crear cupón'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
