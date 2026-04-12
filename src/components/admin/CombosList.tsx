'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Package, ImagePlus, Loader2, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'

interface Combo {
  id: string
  name: string
  description: string | null
  price: number | string
  is_active: boolean
  position: number
  image_url?: string | null
}

interface Props {
  initialCombos: Combo[]
  restaurantId: string
}

export default function CombosList({ initialCombos, restaurantId }: Props) {
  const [combos, setCombos]       = useState<Combo[]>(initialCombos)
  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState<Combo | null>(null)
  const [loading, setLoading]     = useState(false)
  const [imgLoading, setImgLoading] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', image_url: null as string | null })
  const supabase = createClient()

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '', price: '', image_url: null })
    setOpen(true)
  }

  function openEdit(combo: Combo) {
    setEditing(combo)
    setForm({
      name:        combo.name,
      description: combo.description ?? '',
      price:       String(combo.price),
      image_url:   combo.image_url ?? null,
    })
    setOpen(true)
  }

  async function uploadImage(file: File): Promise<string | null> {
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return null }
    const ext  = file.name.split('.').pop()
    const path = `combos/${restaurantId}/${Date.now()}.${ext}`
    setImgLoading(true)
    try {
      const { error } = await supabase.storage.from('restaurant-assets').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path)
      return data.publicUrl
    } catch {
      toast.error('Error al subir la imagen')
      return null
    } finally { setImgLoading(false) }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    if (url) setForm((p) => ({ ...p, image_url: url }))
  }

  async function saveCombo() {
    if (!form.name.trim() || !form.price) return
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) { toast.error('Precio inválido'); return }
    setLoading(true)
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim() || null,
        price,
        image_url:   form.image_url ?? null,
      }
      if (editing) {
        const { error } = await supabase.from('combos').update(payload).eq('id', editing.id)
        if (error) throw error
        setCombos((prev) => prev.map((c) => c.id === editing.id ? { ...c, ...payload } : c))
        toast.success('Paquete actualizado')
      } else {
        const { data, error } = await supabase
          .from('combos')
          .insert({ restaurant_id: restaurantId, ...payload, position: combos.length + 1, is_active: true })
          .select().single()
        if (error) throw error
        setCombos((prev) => [...prev, data])
        toast.success('Paquete creado')
      }
      setOpen(false)
    } catch { toast.error('Error al guardar el paquete') }
    finally { setLoading(false) }
  }

  async function toggleActive(combo: Combo) {
    const { error } = await supabase.from('combos').update({ is_active: !combo.is_active }).eq('id', combo.id)
    if (error) { toast.error('Error al actualizar'); return }
    setCombos((prev) => prev.map((c) => c.id === combo.id ? { ...c, is_active: !c.is_active } : c))
  }

  async function deleteCombo(id: string) {
    if (!confirm('¿Eliminar este paquete?')) return
    const { error } = await supabase.from('combos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setCombos((prev) => prev.filter((c) => c.id !== id))
    toast.success('Paquete eliminado')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" /> Nuevo paquete
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar paquete' : 'Nuevo paquete'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">

              {/* Imagen */}
              <div className="space-y-1.5">
                <Label>Foto del paquete</Label>
                <div className="flex items-center gap-3">
                  {form.image_url ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border shrink-0">
                      <Image src={form.image_url} alt="Paquete" fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, image_url: null }))}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 bg-muted/20">
                      <Package size={24} className="text-muted-foreground/40" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <div className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted transition-colors ${imgLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {imgLoading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                      {imgLoading ? 'Subiendo...' : form.image_url ? 'Cambiar foto' : 'Subir foto'}
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input placeholder="Ej: Todo para tu carne asada"
                  value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input placeholder="Qué incluye el paquete"
                  value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Precio *</Label>
                <Input type="number" placeholder="0.00" min="0" step="0.01"
                  value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
              </div>

              <Button className="w-full" onClick={saveCombo} disabled={loading || imgLoading || !form.name.trim() || !form.price}>
                {loading ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear paquete'}
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {combos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aún no tienes paquetes creados</p>
            <Button className="mt-3" onClick={openCreate}>
              <Plus size={16} className="mr-2" /> Crear primer paquete
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {combos.map((combo) => (
            <Card key={combo.id} className={!combo.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4 flex items-center gap-4">
                {combo.image_url ? (
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border shrink-0">
                    <Image src={combo.image_url} alt={combo.name} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Package size={20} className="text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{combo.name}</p>
                  {combo.description && (
                    <p className="text-sm text-muted-foreground truncate">{combo.description}</p>
                  )}
                  <p className="text-sm font-semibold mt-0.5">{formatCurrency(Number(combo.price))}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Switch checked={combo.is_active} onCheckedChange={() => toggleActive(combo)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(combo)}>
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteCombo(combo.id)}>
                    <Trash2 size={15} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
