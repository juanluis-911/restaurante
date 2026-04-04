import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DriverProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/driver/login')

  const { data: driver } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!driver) redirect('/driver/login')

  return <>{children}</>
}
