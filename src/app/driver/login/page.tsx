'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast, Toaster } from 'sonner'
import { Bike, Car, Zap, UtensilsCrossed } from 'lucide-react'

const VEHICLE_OPTIONS = [
  { value: 'moto',      label: 'Moto',      icon: Zap },
  { value: 'carro',     label: 'Carro',     icon: Car },
  { value: 'bicicleta', label: 'Bicicleta', icon: Bike },
] as const

type Mode = 'login' | 'register' | 'complete-profile'

export default function DriverLoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [vehicle,  setVehicle]  = useState<'moto' | 'carro' | 'bicicleta'>('moto')

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: driver } = await supabase.from('drivers').select('id').eq('user_id', user.id).maybeSingle()
      if (driver) router.replace('/driver')
    }
    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGoogleAuth() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    })
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No se pudo obtener la sesión')

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!driver) {
        // Cuenta existe pero falta el perfil de conductor — dejar completarlo
        setMode('complete-profile')
        return
      }

      router.push('/driver')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Ingresa tu nombre'); return }
    if (!whatsapp.trim()) { toast.error('Ingresa tu WhatsApp'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesión expirada, vuelve a iniciar sesión')

      const { error } = await supabase
        .from('drivers')
        .insert({ user_id: user.id, name: name.trim(), whatsapp: whatsapp.trim(), vehicle_type: vehicle })
      if (error) throw error

      toast.success('¡Perfil creado! Bienvenido.')
      router.push('/driver')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el perfil')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Ingresa tu nombre'); return }
    if (!whatsapp.trim()) { toast.error('Ingresa tu WhatsApp'); return }
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear la cuenta')

      const { error: driverError } = await supabase
        .from('drivers')
        .insert({ user_id: authData.user.id, name: name.trim(), whatsapp: whatsapp.trim(), vehicle_type: vehicle })
      if (driverError) throw driverError

      toast.success('¡Cuenta creada! Bienvenido.')
      router.push('/driver')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Toaster richColors position="top-center" />

      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white mb-2">
            <UtensilsCrossed size={22} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Portal Repartidores</h1>
          <p className="text-sm text-muted-foreground">TuriEats</p>
        </div>

        {/* Tabs — solo en login/register */}
        {mode !== 'complete-profile' && (
          <div className="flex rounded-lg border bg-white p-1 gap-1">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === m ? 'bg-slate-900 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>
        )}

        {/* Google — solo en login/register */}
        {mode !== 'complete-profile' && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 bg-white"
              onClick={handleGoogleAuth}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 text-muted-foreground">o</span>
              </div>
            </div>
          </>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          {mode === 'complete-profile' && (
            <>
              <p className="text-sm font-medium text-slate-700 mb-4">
                Tu cuenta existe pero falta completar tu perfil de repartidor.
              </p>
              <form onSubmit={handleCompleteProfile} className="space-y-4">
                <ProfileFields
                  name={name} setName={setName}
                  whatsapp={whatsapp} setWhatsapp={setWhatsapp}
                  vehicle={vehicle} setVehicle={setVehicle}
                />
                <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                  {loading ? 'Guardando...' : 'Completar y entrar'}
                </Button>
              </form>
            </>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" placeholder="tu@correo.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <ProfileFields
                name={name} setName={setName}
                whatsapp={whatsapp} setWhatsapp={setWhatsapp}
                vehicle={vehicle} setVehicle={setVehicle}
              />
              <div className="space-y-2">
                <Label>Correo electrónico *</Label>
                <Input type="email" placeholder="tu@correo.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={password}
                  onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta y entrar'}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ¿Eres dueño de un restaurante?{' '}
          <a href="/auth/login" className="underline hover:text-foreground">Ingresa aquí</a>
        </p>
      </div>
    </div>
  )
}

function ProfileFields({
  name, setName, whatsapp, setWhatsapp, vehicle, setVehicle,
}: {
  name: string
  setName: (v: string) => void
  whatsapp: string
  setWhatsapp: (v: string) => void
  vehicle: 'moto' | 'carro' | 'bicicleta'
  setVehicle: (v: 'moto' | 'carro' | 'bicicleta') => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Nombre completo *</Label>
        <Input placeholder="Juan Pérez" value={name}
          onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>WhatsApp *</Label>
        <Input type="tel" placeholder="662 123 4567" value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Tipo de vehículo *</Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'moto', label: 'Moto', icon: Zap },
            { value: 'carro', label: 'Carro', icon: Car },
            { value: 'bicicleta', label: 'Bicicleta', icon: Bike },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => setVehicle(value)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition-colors ${
                vehicle === value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'hover:bg-slate-50 text-muted-foreground'
              }`}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
