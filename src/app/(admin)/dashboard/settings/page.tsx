import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from '@/components/admin/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/auth/onboarding')

  const { data: hours } = await supabase
    .from('restaurant_hours')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('day_of_week')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Administra la información y apariencia de tu restaurante</p>
      </div>
      <SettingsForm restaurant={restaurant} hours={hours ?? []} />
    </div>
  )
}
