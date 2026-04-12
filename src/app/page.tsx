import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InstallBanner from '@/components/shared/InstallBanner'
import LandingClient from '@/components/public/LandingClient'

export const revalidate = 60

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirigir dueños y repartidores
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'restaurant_owner') {
      const { data: restaurants } = await supabase
        .from('restaurants').select('id').eq('owner_id', user.id).limit(1)
      redirect(restaurants?.length ? '/dashboard' : '/auth/onboarding')
    }
    if (profile?.role === 'driver') redirect('/driver')
  }

  const { data: businesses } = await supabase
    .from('restaurants')
    .select('*, restaurant_hours(*)')
    .eq('is_active', true)
    .order('created_at')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <>
      <InstallBanner />
      <LandingClient
        businesses={(businesses ?? []) as any}
        user={user}
      />
    </>
  )
}
