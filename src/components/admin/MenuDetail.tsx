'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { Database } from '@/types/database'

type Menu = Database['public']['Tables']['menus']['Row']
type Category = Database['public']['Tables']['categories']['Row'] & {
  products: Database['public']['Tables']['products']['Row'][]
}

interface Props {
  menu: Menu
  initialCategories: Category[]
  restaurantId: string
}

export default function MenuDetail({ menu, initialCategories, restaurantId }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const supabase = createClient()

  // Dialogs
  const [catDialog, setCatDialog] = useState(false)
  const [prodDialog, setProdDialog] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [editingProd, setEditingProd] = useState<Database['public']['Tables']['products']['Row'] | null>(null)
  const [activeCatId, setActiveCatId] = useState<string | null>(null)

  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [prodForm, setProdForm] = useState({
    name: '', description: '', price: '', preparation_time_min: '', is_featured: false,
  })
  const [loading, setLoading] = useState(false)

  function toggleExpand(catId: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  // ── Categories ──────────────────────────────────────────
  function openCreateCat() {
    setEditingCat(null)
    setCatForm({ name: '', description: '' })
    setCatDialog(true)
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat)
    setCatForm({ name: cat.name, description: cat.description ?? '' })
    setCatDialog(true)
  }

  async function saveCat() {
    setLoading(true)
    try {
      if (editingCat) {
        await supabase.from('categories').update(catForm).eq('id', editingCat.id)
        setCategories((prev) =>
          prev.map((c) => c.id === editingCat.id ? { ...c, ...catForm } : c)
        )
        toast.success('Categoría actualizada')
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert({ ...catForm, menu_id: menu.id, restaurant_id: restaurantId, position: categories.length })
          .select()
          .single()
        if (error) throw error
        setCategories((prev) => [...prev, { ...data, products: [] }])
        toast.success('Categoría creada')
      }
      setCatDialog(false)
    } catch { toast.error('Error al guardar') }
    finally { setLoading(false) }
  }

  async function deleteCat(cat: Category) {
    if (!confirm(`¿Eliminar "${cat.name}" y todos sus productos?`)) return
    await supabase.from('categories').delete().eq('id', cat.id)
    setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    toast.success('Categoría eliminada')
  }

  async function toggleCat(cat: Category) {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
  }

  // ── Products ─────────────────────────────────────────────
  function openCreateProd(catId: string) {
    setActiveCatId(catId)
    setEditingProd(null)
    setProdForm({ name: '', description: '', price: '', preparation_time_min: '', is_featured: false })
    setProdDialog(true)
  }

  function openEditProd(prod: Database['public']['Tables']['products']['Row'], catId: string) {
    setActiveCatId(catId)
    setEditingProd(prod)
    setProdForm({
      name: prod.name,
      description: prod.description ?? '',
      price: prod.price.toString(),
      preparation_time_min: prod.preparation_time_min?.toString() ?? '',
      is_featured: prod.is_featured,
    })
    setProdDialog(true)
  }

  async function saveProd() {
    if (!prodForm.name || !prodForm.price) return
    setLoading(true)
    try {
      const payload = {
        name: prodForm.name,
        description: prodForm.description,
        price: parseFloat(prodForm.price),
        preparation_time_min: prodForm.preparation_time_min ? parseInt(prodForm.preparation_time_min) : null,
        is_featured: prodForm.is_featured,
      }

      if (editingProd) {
        await supabase.from('products').update(payload).eq('id', editingProd.id)
        setCategories((prev) => prev.map((c) => ({
          ...c,
          products: c.products.map((p) => p.id === editingProd.id ? { ...p, ...payload } : p),
        })))
        toast.success('Producto actualizado')
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({ ...payload, restaurant_id: restaurantId, category_id: activeCatId, position: 0 })
          .select()
          .single()
        if (error) throw error
        setCategories((prev) => prev.map((c) =>
          c.id === activeCatId ? { ...c, products: [...c.products, data] } : c
        ))
        toast.success('Producto creado')
      }
      setProdDialog(false)
    } catch { toast.error('Error al guardar') }
    finally { setLoading(false) }
  }

  async function toggleProd(prod: Database['public']['Tables']['products']['Row']) {
    await supabase.from('products').update({ is_active: !prod.is_active }).eq('id', prod.id)
    setCategories((prev) => prev.map((c) => ({
      ...c,
      products: c.products.map((p) => p.id === prod.id ? { ...p, is_active: !p.is_active } : p),
    })))
  }

  async function deleteProd(prod: Database['public']['Tables']['products']['Row']) {
    if (!confirm(`¿Eliminar "${prod.name}"?`)) return
    await supabase.from('products').delete().eq('id', prod.id)
    setCategories((prev) => prev.map((c) => ({
      ...c,
      products: c.products.filter((p) => p.id !== prod.id),
    })))
    toast.success('Producto eliminado')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateCat}>
          <Plus size={16} className="mr-2" /> Nueva categoría
        </Button>
      </div>

      {categories.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Este menú no tiene categorías. Crea la primera para empezar a agregar productos.
          </CardContent>
        </Card>
      )}

      {categories.map((cat) => {
        const expanded = expandedCats.has(cat.id)
        return (
          <Card key={cat.id}>
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExpand(cat.id)} className="text-muted-foreground hover:text-foreground">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <Switch checked={cat.is_active} onCheckedChange={() => toggleCat(cat)} />
                  <CardTitle className="text-base">{cat.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{cat.products.length} productos</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditCat(cat)}>
                    <Pencil size={13} />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteCat(cat)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expanded && (
              <CardContent className="px-4 pb-4 pt-0">
                <div className="space-y-2 mb-3">
                  {cat.products.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin productos en esta categoría</p>
                  )}
                  {cat.products.map((prod) => (
                    <div key={prod.id} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Switch checked={prod.is_active} onCheckedChange={() => toggleProd(prod)} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{prod.name}</p>
                            {prod.is_featured && <Badge variant="outline" className="text-xs">Destacado</Badge>}
                          </div>
                          {prod.description && (
                            <p className="text-xs text-muted-foreground truncate">{prod.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-sm">{fmt(Number(prod.price))}</span>
                        <Button size="sm" variant="ghost" onClick={() => openEditProd(prod, cat.id)}>
                          <Pencil size={13} />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteProd(prod)}>
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={() => openCreateProd(cat.id)}>
                  <Plus size={14} className="mr-1" /> Agregar producto
                </Button>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Dialog Categoría */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Tacos, Bebidas, Postres..." value={catForm.name}
                onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input placeholder="Opcional" value={catForm.description}
                onChange={(e) => setCatForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCatDialog(false)}>Cancelar</Button>
              <Button onClick={saveCat} disabled={loading || !catForm.name.trim()}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Producto */}
      <Dialog open={prodDialog} onOpenChange={setProdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProd ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Taco de carnitas" value={prodForm.name}
                onChange={(e) => setProdForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input placeholder="Descripción breve del producto" value={prodForm.description}
                onChange={(e) => setProdForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio *</Label>
                <Input type="number" step="0.50" min="0" placeholder="0.00" value={prodForm.price}
                  onChange={(e) => setProdForm((p) => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tiempo preparación (min)</Label>
                <Input type="number" min="0" placeholder="15" value={prodForm.preparation_time_min}
                  onChange={(e) => setProdForm((p) => ({ ...p, preparation_time_min: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={prodForm.is_featured} onCheckedChange={(v) => setProdForm((p) => ({ ...p, is_featured: v }))} />
              <Label>Marcar como destacado</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setProdDialog(false)}>Cancelar</Button>
              <Button onClick={saveProd} disabled={loading || !prodForm.name || !prodForm.price}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
