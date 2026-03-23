import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/components/admin/DashboardSidebar'
import DashboardHeader from '@/components/admin/DashboardHeader'
import { Toaster } from 'sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/auth/onboarding')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar restaurant={restaurant} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader restaurant={restaurant} user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
