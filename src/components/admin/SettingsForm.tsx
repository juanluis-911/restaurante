'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Bike, Car, Zap, Plus, X, Globe, Users } from 'lucide-react'
import type { Database } from '@/types/database'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Hour = Database['public']['Tables']['restaurant_hours']['Row']
type Driver = { id: string; name: string; whatsapp: string; vehicle_type: 'moto' | 'carro' | 'bicicleta'; status: string }

const VEHICLE_ICON = { moto: Zap, carro: Car, bicicleta: Bike }
const VEHICLE_LABEL = { moto: 'Moto', carro: 'Carro', bicicleta: 'Bicicleta' }

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const FONTS = [
  { value: 'inter',      label: 'Inter (Moderno)' },
  { value: 'playfair',   label: 'Playfair Display (Elegante)' },
  { value: 'roboto',     label: 'Roboto (Limpio)' },
  { value: 'montserrat', label: 'Montserrat (Bold)' },
  { value: 'lora',       label: 'Lora (Clásico)' },
]

interface Props {
  restaurant: Restaurant
  hours: Hour[]
}

export default function SettingsForm({ restaurant, hours }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [info, setInfo] = useState({
    name: restaurant.name,
    slug: restaurant.slug,
    phone: restaurant.phone ?? '',
    address: restaurant.address ?? '',
    whatsapp_number: restaurant.whatsapp_number ?? '',
  })

  const [appearance, setAppearance] = useState({
    primary_color: restaurant.primary_color,
    secondary_color: restaurant.secondary_color,
    font_choice: restaurant.font_choice,
  })

  const [delivery, setDelivery] = useState({
    delivery_enabled: restaurant.delivery_enabled,
    delivery_fee: restaurant.delivery_fee?.toString() ?? '0',
    delivery_min_order: restaurant.delivery_min_order?.toString() ?? '0',
    delivery_radius_km: restaurant.delivery_radius_km?.toString() ?? '',
  })

  const [hoursState, setHoursState] = useState<Hour[]>(hours)

  // ── Repartidores ─────────────────────────────────────────────
  const [driverMode, setDriverMode]   = useState<'global' | 'own'>(
    (restaurant.driver_mode as 'global' | 'own') ?? 'global'
  )
  const [ownDrivers, setOwnDrivers]   = useState<Driver[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Driver[]>([])
  const [addingDriver, setAddingDriver]   = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  useEffect(() => {
    if (driverMode !== 'own') return
    sb
      .from('restaurant_drivers')
      .select('drivers(id, name, whatsapp, vehicle_type, status)')
      .eq('restaurant_id', restaurant.id)
      .then(({ data }: { data: { drivers: Driver | null }[] | null }) => {
        if (data) {
          setOwnDrivers(data.flatMap((row) => (row.drivers ? [row.drivers] : [])))
        }
      })
  }, [driverMode, restaurant.id, sb])

  async function searchDrivers(q: string) {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    const { data } = await sb
      .from('drivers')
      .select('id, name, whatsapp, vehicle_type, status')
      .ilike('name', `%${q}%`)
      .limit(10)
    setSearchResults((data ?? []) as Driver[])
  }

  async function addDriver(driver: Driver) {
    if (ownDrivers.find((d) => d.id === driver.id)) {
      toast.info('Este repartidor ya está asignado')
      return
    }
    setAddingDriver(true)
    const { error } = await sb
      .from('restaurant_drivers')
      .insert({ restaurant_id: restaurant.id, driver_id: driver.id })
    if (error) { toast.error('No se pudo agregar'); setAddingDriver(false); return }
    setOwnDrivers((prev) => [...prev, driver])
    setSearchQuery('')
    setSearchResults([])
    setAddingDriver(false)
    toast.success(`${driver.name} agregado`)
  }

  async function removeDriver(driverId: string) {
    const { error } = await sb
      .from('restaurant_drivers')
      .delete()
      .eq('restaurant_id', restaurant.id)
      .eq('driver_id', driverId)
    if (error) { toast.error('No se pudo eliminar'); return }
    setOwnDrivers((prev) => prev.filter((d) => d.id !== driverId))
    toast.success('Repartidor removido')
  }

  function updateHour(dayOfWeek: number, field: string, value: string | boolean) {
    setHoursState((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    )
  }

  async function saveAll() {
    setLoading(true)
    try {
      // Guardar info general
      const { error: restError } = await supabase
        .from('restaurants')
        .update({
          name: info.name,
          slug: info.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          phone: info.phone,
          address: info.address,
          whatsapp_number: info.whatsapp_number,
          primary_color: appearance.primary_color,
          secondary_color: appearance.secondary_color,
          font_choice: appearance.font_choice,
          delivery_enabled: delivery.delivery_enabled,
          delivery_fee: parseFloat(delivery.delivery_fee) || 0,
          delivery_min_order: parseFloat(delivery.delivery_min_order) || 0,
          delivery_radius_km: delivery.delivery_radius_km ? parseFloat(delivery.delivery_radius_km) : null,
          driver_mode: driverMode,
        })
        .eq('id', restaurant.id)

      if (restError) throw restError

      // Guardar horarios
      for (const hour of hoursState) {
        await supabase
          .from('restaurant_hours')
          .update({
            open_time: hour.open_time,
            close_time: hour.close_time,
            is_closed: hour.is_closed,
          })
          .eq('id', hour.id)
      }

      toast.success('Configuración guardada')
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Info general */}
      <Card>
        <CardHeader><CardTitle className="text-base">Información general</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del restaurante</Label>
            <Input value={info.name} onChange={(e) => setInfo((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>URL pública (slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">tudominio.com/</span>
              <Input
                value={info.slug}
                onChange={(e) => setInfo((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }))}
                placeholder="mi-restaurante"
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones. Ej: peets-burger</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={info.phone} onChange={(e) => setInfo((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp (notificaciones)</Label>
              <Input value={info.whatsapp_number} onChange={(e) => setInfo((p) => ({ ...p, whatsapp_number: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input value={info.address} onChange={(e) => setInfo((p) => ({ ...p, address: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Apariencia */}
      <Card>
        <CardHeader><CardTitle className="text-base">Apariencia</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Color primario</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={appearance.primary_color}
                  onChange={(e) => setAppearance((p) => ({ ...p, primary_color: e.target.value }))}
                  className="h-10 w-14 rounded cursor-pointer border border-input"
                />
                <Input
                  value={appearance.primary_color}
                  onChange={(e) => setAppearance((p) => ({ ...p, primary_color: e.target.value }))}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color secundario</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={appearance.secondary_color}
                  onChange={(e) => setAppearance((p) => ({ ...p, secondary_color: e.target.value }))}
                  className="h-10 w-14 rounded cursor-pointer border border-input"
                />
                <Input
                  value={appearance.secondary_color}
                  onChange={(e) => setAppearance((p) => ({ ...p, secondary_color: e.target.value }))}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipografía</Label>
            <select
              value={appearance.font_choice}
              onChange={(e) => setAppearance((p) => ({ ...p, font_choice: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Delivery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Servicio a domicilio</CardTitle>
            <Switch
              checked={delivery.delivery_enabled}
              onCheckedChange={(v) => setDelivery((p) => ({ ...p, delivery_enabled: v }))}
            />
          </div>
        </CardHeader>
        {delivery.delivery_enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tarifa de envío ($)</Label>
                <Input
                  type="number"
                  value={delivery.delivery_fee}
                  onChange={(e) => setDelivery((p) => ({ ...p, delivery_fee: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Pedido mínimo ($)</Label>
                <Input
                  type="number"
                  value={delivery.delivery_min_order}
                  onChange={(e) => setDelivery((p) => ({ ...p, delivery_min_order: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Radio de cobertura (km)</Label>
                <Input
                  type="number"
                  value={delivery.delivery_radius_km}
                  onChange={(e) => setDelivery((p) => ({ ...p, delivery_radius_km: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Horarios */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Horarios de atención</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() =>
              setHoursState((prev) =>
                prev.map((h) => ({
                  ...h,
                  open_time: h.day_of_week === 0 ? h.open_time : '09:00:00',
                  close_time: h.day_of_week === 0 ? h.close_time : '22:00:00',
                  is_closed: h.day_of_week === 0 ? true : false,
                }))
              )
            }
          >
            Restaurar predeterminados
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {hoursState.map((hour) => (
              <div key={hour.day_of_week} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium">{DAYS[hour.day_of_week]}</span>
                <Switch
                  checked={!hour.is_closed}
                  onCheckedChange={(v) => updateHour(hour.day_of_week, 'is_closed', !v)}
                />
                {!hour.is_closed ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={hour.open_time?.slice(0, 5) ?? '09:00'}
                      onChange={(e) => updateHour(hour.day_of_week, 'open_time', e.target.value)}
                      className="w-32 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">a</span>
                    <Input
                      type="time"
                      value={hour.close_time?.slice(0, 5) ?? '22:00'}
                      onChange={(e) => updateHour(hour.day_of_week, 'close_time', e.target.value)}
                      className="w-32 text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Repartidores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repartidores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modo */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDriverMode('global')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                driverMode === 'global'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Globe size={22} className={driverMode === 'global' ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-sm font-medium">Global</span>
              <span className="text-xs text-muted-foreground text-center leading-tight">
                Cualquier repartidor registrado puede tomar tus pedidos
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDriverMode('own')}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                driverMode === 'own'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <Users size={22} className={driverMode === 'own' ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-sm font-medium">Propios</span>
              <span className="text-xs text-muted-foreground text-center leading-tight">
                Solo los repartidores que tú asignes podrán tomar pedidos
              </span>
            </button>
          </div>

          {/* Lista de repartidores propios */}
          {driverMode === 'own' && (
            <div className="space-y-3">
              <Label>Repartidores asignados</Label>

              {ownDrivers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay repartidores asignados aún.</p>
              ) : (
                <div className="space-y-2">
                  {ownDrivers.map((d) => {
                    const VIcon = VEHICLE_ICON[d.vehicle_type]
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <VIcon size={14} className="text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">{d.name}</span>
                          <Badge variant="secondary" className="text-xs">{VEHICLE_LABEL[d.vehicle_type]}</Badge>
                          <Badge
                            variant={d.status === 'available' ? 'default' : d.status === 'busy' ? 'outline' : 'secondary'}
                            className="text-xs"
                          >
                            {d.status === 'available' ? 'Disponible' : d.status === 'busy' ? 'Ocupado' : 'Fuera de línea'}
                          </Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDriver(d.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Buscar y agregar */}
              <div className="space-y-2">
                <Label>Agregar repartidor</Label>
                <div className="relative">
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => searchDrivers(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {searchResults.map((d) => {
                        const VIcon = VEHICLE_ICON[d.vehicle_type]
                        const alreadyAdded = ownDrivers.some((od) => od.id === d.id)
                        return (
                          <button
                            key={d.id}
                            type="button"
                            disabled={alreadyAdded || addingDriver}
                            onClick={() => addDriver(d)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            <VIcon size={13} className="text-muted-foreground shrink-0" />
                            <span className="font-medium">{d.name}</span>
                            <span className="text-muted-foreground">{VEHICLE_LABEL[d.vehicle_type]}</span>
                            {alreadyAdded && <span className="ml-auto text-xs text-muted-foreground">ya asignado</span>}
                            {!alreadyAdded && <Plus size={13} className="ml-auto text-muted-foreground" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  El repartidor debe registrarse primero en <span className="font-mono">/driver/login</span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={saveAll} disabled={loading} className="w-full">
        {loading ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </div>
  )
}
