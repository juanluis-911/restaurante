import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Proteger rutas del dashboard
  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Gate de suspensión: si el restaurante está suspendido, redirigir a /dashboard/billing
  // Excepciones: la propia página de billing, las rutas de API de Stripe, y auth
  const billingExempt =
    pathname === '/dashboard/billing' ||
    pathname.startsWith('/api/stripe/') ||
    pathname.startsWith('/api/billing/') ||
    pathname.startsWith('/auth/')

  if (user && pathname.startsWith('/dashboard') && !billingExempt) {
    // Leer el billing_status de la cookie (se actualiza al cargar el dashboard)
    const billingStatus = request.cookies.get('billing_status')?.value
    if (billingStatus === 'suspended') {
      return NextResponse.redirect(new URL('/dashboard/billing', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
