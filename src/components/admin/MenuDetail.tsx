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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, X, ImagePlus, Loader2 } from 'lucide-react'
import Image from 'next/image'
import type { Database } from '@/types/database'

type Menu = Database['public']['Tables']['menus']['Row']
type Category = Database['public']['Tables']['categories']['Row'] & {
  products: Database['public']['Tables']['products']['Row'][]
}
type Product = Database['public']['Tables']['products']['Row']
type Combo = Database['public']['Tables']['combos']['Row']

interface ComboItem { product_id: string; quantity: number }

interface Props {
  menu: Menu
  initialCategories: Category[]
  restaurantId: string
}

const ALLERGEN_OPTIONS = [
  'Gluten', 'Lácteos', 'Huevo', 'Mariscos', 'Pescado',
  'Cacahuetes', 'Nueces', 'Soya', 'Apio', 'Mostaza',
  'Sésamo', 'Sulfitos', 'Altramuces', 'Moluscos',
]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)

export default function MenuDetail({ menu, initialCategories, restaurantId }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [combos, setCombos] = useState<Combo[]>([])
  const [combosLoaded, setCombosLoaded] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const supabase = createClient()

  // Dialogs
  const [catDialog, setCatDialog] = useState(false)
  const [prodDialog, setProdDialog] = useState(false)
  const [comboDialog, setComboDialog] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [editingProd, setEditingProd] = useState<Product | null>(null)
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null)
  const [activeCatId, setActiveCatId] = useState<string | null>(null)

  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [prodForm, setProdForm] = useState({
    name: '', description: '', price: '', preparation_time_min: '',
    is_featured: false, allergens: [] as string[], image_url: '' as string | null,
  })
  const [comboForm, setComboForm] = useState({
    name: '', description: '', price: '', items: [] as ComboItem[],
  })
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)

  // All products flat list (for combo picker)
  const allProducts = categories.flatMap((c) => c.products)

  function toggleExpand(catId: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  async function loadCombos() {
    if (combosLoaded) return
    const { data } = await supabase
      .from('combos')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('position')
    setCombos(data ?? [])
    setCombosLoaded(true)
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
    setProdForm({ name: '', description: '', price: '', preparation_time_min: '', is_featured: false, allergens: [], image_url: null })
    setProdDialog(true)
  }

  function openEditProd(prod: Product, catId: string) {
    setActiveCatId(catId)
    setEditingProd(prod)
    setProdForm({
      name: prod.name,
      description: prod.description ?? '',
      price: prod.price.toString(),
      preparation_time_min: prod.preparation_time_min?.toString() ?? '',
      is_featured: prod.is_featured,
      allergens: prod.allergens ?? [],
      image_url: prod.image_url ?? null,
    })
    setProdDialog(true)
  }

  async function uploadProductImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `products/${restaurantId}/${Date.now()}.${ext}`
    setImageUploading(true)
    try {
      const { error } = await supabase.storage
        .from('restaurant-assets')
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path)
      return data.publicUrl
    } catch {
      toast.error('Error al subir la imagen')
      return null
    } finally {
      setImageUploading(false)
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede superar 5 MB')
      return
    }
    const url = await uploadProductImage(file)
    if (url) setProdForm((p) => ({ ...p, image_url: url }))
  }

  function toggleAllergen(allergen: string) {
    setProdForm((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter((a) => a !== allergen)
        : [...prev.allergens, allergen],
    }))
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
        allergens: prodForm.allergens,
        image_url: prodForm.image_url ?? null,
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

  async function toggleProd(prod: Product) {
    await supabase.from('products').update({ is_active: !prod.is_active }).eq('id', prod.id)
    setCategories((prev) => prev.map((c) => ({
      ...c,
      products: c.products.map((p) => p.id === prod.id ? { ...p, is_active: !p.is_active } : p),
    })))
  }

  async function deleteProd(prod: Product) {
    if (!confirm(`¿Eliminar "${prod.name}"?`)) return
    await supabase.from('products').delete().eq('id', prod.id)
    setCategories((prev) => prev.map((c) => ({
      ...c,
      products: c.products.filter((p) => p.id !== prod.id),
    })))
    toast.success('Producto eliminado')
  }

  // ── Combos ───────────────────────────────────────────────
  function openCreateCombo() {
    setEditingCombo(null)
    setComboForm({ name: '', description: '', price: '', items: [] })
    setComboDialog(true)
  }

  function openEditCombo(combo: Combo) {
    setEditingCombo(combo)
    const items = (combo.items as unknown as ComboItem[]) ?? []
    setComboForm({
      name: combo.name,
      description: combo.description ?? '',
      price: combo.price.toString(),
      items,
    })
    setComboDialog(true)
  }

  function addComboItem(productId: string) {
    setComboForm((prev) => {
      const existing = prev.items.find((i) => i.product_id === productId)
      if (existing) {
        return { ...prev, items: prev.items.map((i) => i.product_id === productId ? { ...i, quantity: i.quantity + 1 } : i) }
      }
      return { ...prev, items: [...prev.items, { product_id: productId, quantity: 1 }] }
    })
  }

  function removeComboItem(productId: string) {
    setComboForm((prev) => ({ ...prev, items: prev.items.filter((i) => i.product_id !== productId) }))
  }

  function updateComboItemQty(productId: string, qty: number) {
    if (qty < 1) return removeComboItem(productId)
    setComboForm((prev) => ({
      ...prev,
      items: prev.items.map((i) => i.product_id === productId ? { ...i, quantity: qty } : i),
    }))
  }

  async function saveCombo() {
    if (!comboForm.name || !comboForm.price || comboForm.items.length < 2) {
      toast.error('Completa nombre, precio y agrega al menos 2 productos')
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: comboForm.name,
        description: comboForm.description,
        price: parseFloat(comboForm.price),
        items: comboForm.items as unknown as import('@/types/database').Json,
        restaurant_id: restaurantId,
      }

      if (editingCombo) {
        const { error } = await supabase.from('combos').update(payload).eq('id', editingCombo.id)
        if (error) throw error
        setCombos((prev) => prev.map((c) => c.id === editingCombo.id ? { ...c, ...payload } : c))
        toast.success('Combo actualizado')
      } else {
        const { data, error } = await supabase
          .from('combos')
          .insert({ ...payload, position: combos.length })
          .select()
          .single()
        if (error) throw error
        setCombos((prev) => [...prev, data])
        toast.success('Combo creado')
      }
      setComboDialog(false)
    } catch { toast.error('Error al guardar') }
    finally { setLoading(false) }
  }

  async function toggleCombo(combo: Combo) {
    await supabase.from('combos').update({ is_active: !combo.is_active }).eq('id', combo.id)
    setCombos((prev) => prev.map((c) => c.id === combo.id ? { ...c, is_active: !c.is_active } : c))
  }

  async function deleteCombo(combo: Combo) {
    if (!confirm(`¿Eliminar el combo "${combo.name}"?`)) return
    await supabase.from('combos').delete().eq('id', combo.id)
    setCombos((prev) => prev.filter((c) => c.id !== combo.id))
    toast.success('Combo eliminado')
  }

  return (
    <Tabs defaultValue="categories" onValueChange={(v) => v === 'combos' && loadCombos()}>
      <TabsList>
        <TabsTrigger value="categories">Categorías y productos</TabsTrigger>
        <TabsTrigger value="combos">Combos</TabsTrigger>
      </TabsList>

      {/* ── TAB: Categorías ─────────────────────────────── */}
      <TabsContent value="categories" className="space-y-4 mt-4">
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
                          {prod.image_url && (
                            <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
                              <Image src={prod.image_url} alt={prod.name} fill className="object-cover" unoptimized />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{prod.name}</p>
                              {prod.is_featured && <Badge variant="outline" className="text-xs">Destacado</Badge>}
                              {prod.allergens && prod.allergens.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{prod.allergens.length} alérgenos</Badge>
                              )}
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
      </TabsContent>

      {/* ── TAB: Combos ─────────────────────────────────── */}
      <TabsContent value="combos" className="space-y-4 mt-4">
        <div className="flex justify-end">
          <Button onClick={openCreateCombo} disabled={allProducts.length < 2}>
            <Plus size={16} className="mr-2" /> Nuevo combo
          </Button>
        </div>

        {allProducts.length < 2 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Necesitas al menos 2 productos en tus categorías para crear combos.
            </CardContent>
          </Card>
        )}

        {allProducts.length >= 2 && combosLoaded && combos.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No hay combos creados. Crea el primero para ofrecer bundles especiales.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          {combos.map((combo) => {
            const items = (combo.items as unknown as ComboItem[]) ?? []
            return (
              <Card key={combo.id}>
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch checked={combo.is_active} onCheckedChange={() => toggleCombo(combo)} />
                      <div>
                        <CardTitle className="text-base">{combo.name}</CardTitle>
                        {combo.description && (
                          <p className="text-sm text-muted-foreground">{combo.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{fmt(combo.price)}</span>
                      <Button size="sm" variant="ghost" onClick={() => openEditCombo(combo)}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteCombo(combo)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => {
                      const prod = allProducts.find((p) => p.id === item.product_id)
                      if (!prod) return null
                      return (
                        <Badge key={item.product_id} variant="secondary" className="text-xs">
                          {item.quantity}x {prod.name}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </TabsContent>

      {/* ── Dialog: Categoría ───────────────────────────── */}
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

      {/* ── Dialog: Producto ────────────────────────────── */}
      <Dialog open={prodDialog} onOpenChange={setProdDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-2">
              <Label>Foto del producto</Label>
              <div className="flex items-center gap-3">
                {prodForm.image_url ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border shrink-0">
                    <Image src={prodForm.image_url} alt="Producto" fill className="object-cover" unoptimized />
                    <button
                      type="button"
                      onClick={() => setProdForm((p) => ({ ...p, image_url: null }))}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground shrink-0">
                    <ImagePlus size={24} />
                  </div>
                )}
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <div className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted transition-colors ${imageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {imageUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                      {imageUploading ? 'Subiendo...' : prodForm.image_url ? 'Cambiar foto' : 'Subir foto'}
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={imageUploading}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG o WebP · máx. 5 MB</p>
                </div>
              </div>
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
            <div className="space-y-2">
              <Label>Alérgenos</Label>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map((allergen) => {
                  const selected = prodForm.allergens.includes(allergen)
                  return (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => toggleAllergen(allergen)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {allergen}
                    </button>
                  )
                })}
              </div>
              {prodForm.allergens.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Seleccionados: {prodForm.allergens.join(', ')}
                </p>
              )}
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

      {/* ── Dialog: Combo ───────────────────────────────── */}
      <Dialog open={comboDialog} onOpenChange={setComboDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCombo ? 'Editar combo' : 'Nuevo combo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input placeholder="Ej: Combo familiar, Menú del día..." value={comboForm.name}
                onChange={(e) => setComboForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input placeholder="Descripción breve" value={comboForm.description}
                onChange={(e) => setComboForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Precio del combo *</Label>
              <Input type="number" step="0.50" min="0" placeholder="0.00" value={comboForm.price}
                onChange={(e) => setComboForm((p) => ({ ...p, price: e.target.value }))} />
              {comboForm.items.length > 0 && (() => {
                const sumItems = comboForm.items.reduce((acc, item) => {
                  const prod = allProducts.find((p) => p.id === item.product_id)
                  return acc + (prod ? Number(prod.price) * item.quantity : 0)
                }, 0)
                const comboPrice = parseFloat(comboForm.price) || 0
                const savings = sumItems - comboPrice
                return savings > 0 ? (
                  <p className="text-xs text-green-600">Ahorro: {fmt(savings)} vs precio individual ({fmt(sumItems)})</p>
                ) : null
              })()}
            </div>

            <div className="space-y-2">
              <Label>Productos del combo (mínimo 2) *</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {allProducts.map((prod) => {
                  const inCombo = comboForm.items.find((i) => i.product_id === prod.id)
                  return (
                    <div key={prod.id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{prod.name} <span className="text-muted-foreground">({fmt(Number(prod.price))})</span></span>
                      {inCombo ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => updateComboItemQty(prod.id, inCombo.quantity - 1)}
                            className="w-6 h-6 rounded border flex items-center justify-center hover:bg-muted">-</button>
                          <span className="w-6 text-center">{inCombo.quantity}</span>
                          <button onClick={() => updateComboItemQty(prod.id, inCombo.quantity + 1)}
                            className="w-6 h-6 rounded border flex items-center justify-center hover:bg-muted">+</button>
                          <button onClick={() => removeComboItem(prod.id)} className="ml-1 text-destructive hover:text-destructive/80">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addComboItem(prod.id)}
                          className="shrink-0 text-xs px-2 py-0.5 rounded border hover:bg-muted">
                          + Agregar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {comboForm.items.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {comboForm.items.map((item) => {
                    const prod = allProducts.find((p) => p.id === item.product_id)
                    return prod ? (
                      <Badge key={item.product_id} variant="secondary" className="text-xs">
                        {item.quantity}x {prod.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setComboDialog(false)}>Cancelar</Button>
              <Button onClick={saveCombo} disabled={loading || !comboForm.name || !comboForm.price || comboForm.items.length < 2}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
