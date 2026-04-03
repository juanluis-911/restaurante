'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

type Mode = 'login' | 'signup'

export default function ClienteLoginPage() {
  return (
    <Suspense>
      <ClienteLoginForm />
    </Suspense>
  )
}

function ClienteLoginForm() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>(
    searchParams.get('modo') === 'registro' ? 'signup' : 'login'
  )
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre]     = useState('')
  const [loading, setLoading]   = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Redirigir si ya hay sesión activa
  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'restaurant_owner') {
        const { data: restaurants } = await supabase
          .from('restaurants').select('id').eq('owner_id', user.id).limit(1)
        router.replace(restaurants?.length ? '/dashboard' : '/auth/onboarding')
      } else if (profile?.role === 'driver') {
        router.replace('/driver')
      } else {
        router.replace('/cliente')
      }
    }
    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Google OAuth ──────────────────────────────────────────
  async function handleGoogleAuth() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` },
    })
  }

  // ── Login con email ───────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/cliente')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  // ── Signup con email ──────────────────────────────────────
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { toast.error('Ingresa tu nombre'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nombre.trim() } },
      })
      if (error) throw error
      if (!data.user) throw new Error('No se pudo crear la cuenta')

      await supabase.from('user_profiles').insert({ id: data.user.id, role: 'customer' })

      toast.success('¡Cuenta creada! Bienvenido a TuriEats.')
      router.push('/cliente')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setEmail('')
    setPassword('')
    setNombre('')
  }

  const GoogleButton = ({ label }: { label: string }) => (
    <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogleAuth}>
      <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {label}
    </Button>
  )

  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      {/* Mini header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/">
            <Image src="/turieats.png" alt="TuriEats" width={160} height={48} className="h-10 w-auto object-contain" />
          </Link>
          <Link href="/auth/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ¿Eres un restaurante?
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl">
              🍽️
            </div>
            <CardTitle className="text-2xl">
              {mode === 'login' ? 'Inicia sesión' : 'Crear cuenta'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Accede para ver los restaurantes y hacer pedidos'
                : 'Regístrate gratis para empezar a pedir'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <GoogleButton label={mode === 'login' ? 'Continuar con Google' : 'Registrarse con Google'} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o con email</span>
              </div>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Inicia sesión'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input
                    id="nombre"
                    placeholder="Juan Pérez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </Button>
              </form>
            )}

            <div className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-primary underline-offset-4 hover:underline"
              >
                {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
