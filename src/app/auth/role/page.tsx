'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { UtensilsCrossed, Bike, Car, Zap, User } from 'lucide-react'

type Role = 'restaurant_owner' | 'driver' | 'customer'
type Vehicle = 'moto' | 'carro' | 'bicicleta'

const ROLES = [
  {
    value: 'restaurant_owner' as Role,
    icon: UtensilsCrossed,
    title: 'Restaurante',
    description: 'Gestiona tu negocio, menú y pedidos',
  },
  {
    value: 'driver' as Role,
    icon: Bike,
    title: 'Repartidor',
    description: 'Entrega pedidos en tu zona',
  },
  {
    value: 'customer' as Role,
    icon: User,
    title: 'Cliente',
    description: 'Haz pedidos desde cualquier lugar',
  },
]

const VEHICLES = [
  { value: 'moto' as Vehicle,      label: 'Moto',      icon: Zap },
  { value: 'carro' as Vehicle,     label: 'Carro',     icon: Car },
  { value: 'bicicleta' as Vehicle, label: 'Bicicleta', icon: Bike },
]

export default function RolePage() {
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole]       = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)

  // Driver extra fields
  const [name,     setName]     = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [vehicle,  setVehicle]  = useState<Vehicle>('moto')

  // Verificar sesión activa y que no tenga rol ya asignado
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        await redirectByRole(profile.role as Role, user.id)
      }
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function redirectByRole(r: Role, userId?: string) {
    if (r === 'restaurant_owner') {
      const uid = userId ?? (await supabase.auth.getUser()).data.user?.id ?? ''
      const { data: restaurants } = await supabase
        .from('restaurants').select('id').eq('owner_id', uid).limit(1)
      router.replace(restaurants?.length ? '/dashboard' : '/auth/onboarding')
    } else if (r === 'driver') {
      router.replace('/driver')
    } else {
      router.replace('/')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!role) return

    if (role === 'driver') {
      if (!name.trim())     { toast.error('Ingresa tu nombre'); return }
      if (!whatsapp.trim()) { toast.error('Ingresa tu WhatsApp'); return }
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({ id: user.id, role })

      if (profileError) throw profileError

      if (role === 'driver') {
        const { error: driverError } = await supabase
          .from('drivers')
          .insert({
            user_id: user.id,
            name: name.trim(),
            whatsapp: whatsapp.trim(),
            vehicle_type: vehicle,
          })
        if (driverError) throw driverError
      }

      toast.success('¡Bienvenido!')
      await redirectByRole(role)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar tu perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
            👋
          </div>
          <h1 className="text-2xl font-bold">¿Cómo vas a usar la plataforma?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige tu rol para configurar tu experiencia
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selección de rol */}
          <div className="grid gap-3">
            {ROLES.map(({ value, icon: Icon, title, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                  role === value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'bg-card hover:bg-muted/50'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  role === value ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Campos extra para repartidor */}
          {role === 'driver' && (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <p className="text-sm font-medium text-muted-foreground">Datos del repartidor</p>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input
                  id="name"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="644 123 4567"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de vehículo *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {VEHICLES.map(({ value: v, label, icon: VIcon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVehicle(v)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-sm font-medium transition-colors ${
                        vehicle === v
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <VIcon size={18} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!role || loading}>
            {loading ? 'Guardando...' : 'Continuar →'}
          </Button>
        </form>
      </div>
    </div>
  )
}
