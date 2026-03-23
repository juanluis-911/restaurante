'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const TIMEZONES = [
  { value: 'America/Hermosillo', label: 'Sonora (MST)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
  { value: 'America/Tijuana', label: 'Tijuana (PST)' },
  { value: 'America/Monterrey', label: 'Monterrey (CST)' },
  { value: 'America/Cancun', label: 'Cancún (EST)' },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    slug: '',
    phone: '',
    address: '',
    timezone: 'America/Hermosillo',
  })

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugify(name),
    }))
  }

  async function checkSlug() {
    const { data } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', form.slug)
      .maybeSingle()   // ← solo este cambio
    return !!data
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')

      // Verificar slug único
      const slugTaken = await checkSlug()
      if (slugTaken) {
        toast.error('Ese slug ya está en uso, elige otro')
        setLoading(false)
        return
      }

      // Crear restaurante
      const { data: restaurant, error: restError } = await supabase
        .from('restaurants')
        .insert({
          owner_id: user.id,
          name: form.name,
          slug: form.slug,
          phone: form.phone,
          address: form.address,
          timezone: form.timezone,
        })
        .select()
        .single()

      if (restError) throw restError

      // Crear horarios por defecto (lun-sab abiertos, dom cerrado)
      const hours = Array.from({ length: 7 }, (_, i) => ({
        restaurant_id: restaurant.id,
        day_of_week: i,
        open_time: '09:00:00',
        close_time: '22:00:00',
        is_closed: i === 0, // domingo cerrado por defecto
      }))

      await supabase.from('restaurant_hours').insert(hours)

      toast.success('¡Restaurante creado exitosamente!')
      router.push('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear el restaurante'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl">🎉</div>
          <CardTitle className="text-2xl">Configura tu restaurante</CardTitle>
          <CardDescription>
            Solo toma un minuto. Puedes cambiar todo esto después en Configuración.
          </CardDescription>
          {/* Indicador de pasos */}
          <div className="flex justify-center gap-2 pt-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2) } : handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del restaurante *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Tacos El Güero"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">
                    URL pública{' '}
                    <span className="text-xs text-muted-foreground">(se genera automático)</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">tuapp.com/</span>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona horaria</Label>
                  <select
                    id="timezone"
                    value={form.timezone}
                    onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" className="w-full" disabled={!form.name || !form.slug}>
                  Continuar →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="644 123 4567"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    placeholder="Calle, número, colonia, ciudad"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  />
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  💡 Estos datos aparecerán en tu página pública. El teléfono y dirección son opcionales.
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    ← Atrás
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Creando...' : '¡Listo, empezar!'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
