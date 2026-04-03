'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Bike, Car, Zap, Plus, X, Globe, Users, CreditCard, CheckCircle2, AlertCircle, ExternalLink, Unlink, Upload, ImageIcon } from 'lucide-react'
import QRShareCard from '@/components/admin/QRShareCard'
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
  stripeConnected?: boolean
  stripeError?: boolean
  stripePending?: boolean
}

export default function SettingsForm({ restaurant, hours, stripeConnected, stripeError, stripePending }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (stripeConnected) toast.success('¡Cuenta Stripe conectada exitosamente!')
    if (stripeError)     toast.error('Error al conectar con Stripe. Intenta de nuevo.')
    if (stripePending)   toast.info('Onboarding de Stripe incompleto. Vuelve a conectar para terminarlo.')
  }, [stripeConnected, stripeError, stripePending])

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

  const [logoUrl, setLogoUrl]               = useState<string | null>(restaurant.logo_url ?? null)
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>((restaurant as { header_image_url?: string | null }).header_image_url ?? null)
  const [uploadingLogo, setUploadingLogo]   = useState(false)
  const [uploadingHeader, setUploadingHeader] = useState(false)
  const logoInputRef   = useRef<HTMLInputElement>(null)
  const headerInputRef = useRef<HTMLInputElement>(null)

  async function uploadImage(file: File, folder: 'logos' | 'headers'): Promise<string | null> {
    const ext  = file.name.split('.').pop()
    const path = `${folder}/${restaurant.id}.${ext}`
    const { error } = await supabase.storage
      .from('restaurant-assets')
      .upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir imagen'); return null }
    const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(path)
    return data.publicUrl + `?t=${Date.now()}`
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const url = await uploadImage(file, 'logos')
    if (url) {
      setLogoUrl(url)
      await supabase.from('restaurants').update({ logo_url: url }).eq('id', restaurant.id)
      toast.success('Logo actualizado')
    }
    setUploadingLogo(false)
  }

  async function handleHeaderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHeader(true)
    const url = await uploadImage(file, 'headers')
    if (url) {
      setHeaderImageUrl(url)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('restaurants').update({ header_image_url: url }).eq('id', restaurant.id)
      toast.success('Imagen de portada actualizada')
    }
    setUploadingHeader(false)
  }

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

      {/* Imágenes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Imágenes</CardTitle></CardHeader>
        <CardContent className="space-y-6">

          {/* Logo */}
          <div className="space-y-3">
            <Label>Logotipo</Label>
            <div className="flex items-center gap-4">
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl overflow-hidden border-2 border-dashed border-muted-foreground/25 bg-muted/30 cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={24} className="text-muted-foreground/40" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Aparece en el menú, historial de pedidos y seguimiento. Recomendado: cuadrado, mínimo 200×200px.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="gap-1.5"
                >
                  <Upload size={13} />
                  {uploadingLogo ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
                </Button>
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          {/* Header image */}
          <div className="space-y-3">
            <Label>Imagen de portada</Label>
            <div
              className="relative h-32 w-full rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/25 bg-muted/30 cursor-pointer hover:border-muted-foreground/50 transition-colors flex items-center justify-center"
              onClick={() => headerInputRef.current?.click()}
            >
              {headerImageUrl ? (
                <>
                  <img src={headerImageUrl} alt="Portada" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium flex items-center gap-1.5"><Upload size={14} /> Cambiar imagen</span>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-1">
                  <ImageIcon size={28} className="mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Toca para subir imagen de portada</p>
                  <p className="text-xs text-muted-foreground/60">Recomendado: 1200×400px</p>
                </div>
              )}
            </div>
            {uploadingHeader && <p className="text-xs text-muted-foreground">Subiendo imagen...</p>}
            <input ref={headerInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderChange} />
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

      {/* ── Stripe Connect ───────────────────────────────────── */}
      <StripeConnectCardInline restaurant={restaurant} />

      {/* ── QR Codes ─────────────────────────────────────────── */}
      <QRShareCard slug={info.slug} />

      <Button onClick={saveAll} disabled={loading} className="w-full">
        {loading ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </div>
  )
}

// ── Stripe Connect inline (sin importar archivo externo) ──────────────────────
function StripeConnectCardInline({ restaurant }: { restaurant: Restaurant }) {
  const [disconnecting, setDisconnecting] = useState(false)

  const isConnected = restaurant.stripe_account_status === 'active' && !!restaurant.stripe_account_id

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/stripe/connect/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Cuenta Stripe desconectada')
      window.location.reload()
    } catch {
      toast.error('Error al desconectar la cuenta')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 font-medium">
          <CreditCard size={16} />
          Pagos con Stripe
        </div>
        <p className="text-sm text-muted-foreground">
          Conecta tu cuenta Stripe para recibir pagos de tus clientes directamente.
        </p>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
              <CheckCircle2 size={12} /> Conectado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
              <AlertCircle size={12} /> No conectado
            </span>
          )}
          {restaurant.stripe_account_id && (
            <span className="text-xs text-muted-foreground font-mono">{restaurant.stripe_account_id}</span>
          )}
        </div>
        {isConnected ? (
          <div className="flex gap-2">
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium h-7 hover:bg-muted transition-colors"
            >
              <ExternalLink size={13} /> Ver dashboard Stripe
            </a>
            <Button
              variant="outline" size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={handleDisconnect} disabled={disconnecting}
            >
              <Unlink size={13} />
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </Button>
          </div>
        ) : (
          <a
            href="/api/stripe/connect/authorize"
            className="inline-flex items-center gap-1.5 rounded-[min(var(--radius-md),12px)] bg-primary text-primary-foreground px-2.5 text-[0.8rem] font-medium h-7 hover:bg-primary/90 transition-colors"
          >
            <CreditCard size={13} /> Conectar cuenta Stripe
          </a>
        )}
      </CardContent>
    </Card>
  )
}
