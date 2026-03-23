'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Hour = Database['public']['Tables']['restaurant_hours']['Row']

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
        <CardHeader><CardTitle className="text-base">Horarios de atención</CardTitle></CardHeader>
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

      <Button onClick={saveAll} disabled={loading} className="w-full">
        {loading ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </div>
  )
}
