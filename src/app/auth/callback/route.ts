import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        // Usuario nuevo sin rol asignado
        if (!profile) {
          return NextResponse.redirect(`${origin}/auth/role`)
        }

        // Rutear según rol
        if (profile.role === 'restaurant_owner') {
          const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1)
          return NextResponse.redirect(
            `${origin}${restaurants?.length ? '/dashboard' : '/auth/onboarding'}`
          )
        }

        if (profile.role === 'driver') {
          return NextResponse.redirect(`${origin}/driver`)
        }

        // customer → dashboard cliente
        return NextResponse.redirect(`${origin}/cliente`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`)
}
