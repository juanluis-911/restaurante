import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/admin/SettingsForm'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'
import type { NextRequest } from 'next/server'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe_connected?: string; stripe_error?: string; stripe_pending?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  const { data: hours } = await supabase
    .from('restaurant_hours')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('day_of_week')

  const params = await searchParams

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Administra la información y apariencia de tu restaurante</p>
      </div>
      <SettingsForm
        restaurant={restaurant}
        hours={hours ?? []}
        stripeConnected={params.stripe_connected === '1'}
        stripeError={params.stripe_error === '1'}
        stripePending={params.stripe_pending === '1'}
      />
    </div>
  )
}
