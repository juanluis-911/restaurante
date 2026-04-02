'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'

interface Menu {
  id: string
  name: string
  description: string | null
  is_active: boolean
  position: number
  categories?: { count: number }[]
}

interface Props {
  initialMenus: Menu[]
  restaurantId: string
}

export default function MenusList({ initialMenus, restaurantId }: Props) {
  const [menus, setMenus] = useState<Menu[]>(initialMenus)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Menu | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '' })
    setOpen(true)
  }

  function openEdit(menu: Menu) {
    setEditing(menu)
    setForm({ name: menu.name, description: menu.description ?? '' })
    setOpen(true)
  }

  async function saveMenu() {
    if (!form.name.trim()) return
    setLoading(true)

    try {
      if (editing) {
        const { error } = await supabase
          .from('menus')
          .update({ name: form.name, description: form.description })
          .eq('id', editing.id)
        if (error) throw error
        setMenus((prev) =>
          prev.map((m) => m.id === editing.id ? { ...m, ...form } : m)
        )
        toast.success('Menú actualizado')
      } else {
        const { data, error } = await supabase
          .from('menus')
          .insert({
            restaurant_id: restaurantId,
            name: form.name,
            description: form.description,
            position: menus.length,
          })
          .select()
          .single()
        if (error) throw error
        setMenus((prev) => [...prev, data])
        toast.success('Menú creado')
      }
      setOpen(false)
    } catch {
      toast.error('Error al guardar el menú')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(menu: Menu) {
    const { error } = await supabase
      .from('menus')
      .update({ is_active: !menu.is_active })
      .eq('id', menu.id)

    if (!error) {
      setMenus((prev) =>
        prev.map((m) => m.id === menu.id ? { ...m, is_active: !m.is_active } : m)
      )
    }
  }

  async function deleteMenu(menu: Menu) {
    if (!confirm(`¿Eliminar el menú "${menu.name}"? Se eliminarán todas sus categorías y productos.`)) return

    const { error } = await supabase.from('menus').delete().eq('id', menu.id)
    if (error) {
      toast.error('No se pudo eliminar')
    } else {
      setMenus((prev) => prev.filter((m) => m.id !== menu.id))
      toast.success('Menú eliminado')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              Nuevo menú
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar menú' : 'Nuevo menú'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  placeholder="Ej: Menú principal, Taquería, Hamburguesería..."
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  placeholder="Descripción breve (opcional)"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={saveMenu} disabled={loading || !form.name.trim()}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {menus.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UtensilsCrossed size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aún no tienes menús creados</p>
            <Button className="mt-3" onClick={openCreate}>
              <Plus size={16} className="mr-2" /> Crear primer menú
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {menus.map((menu) => {
            const catCount = menu.categories?.[0]?.count ?? 0
            return (
              <Card key={menu.id}>
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={menu.is_active}
                        onCheckedChange={() => toggleActive(menu)}
                      />
                      <div>
                        <CardTitle className="text-base">{menu.name}</CardTitle>
                        {menu.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">{menu.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                        {menu.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {catCount} {catCount === 1 ? 'categoría' : 'categorías'}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                      >
                        <Link href={`/dashboard/menus/${menu.id}`}>
                          Ver categorías y productos
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(menu)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMenu(menu)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
