import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import DashboardSidebar from '@/components/admin/DashboardSidebar'
import DashboardHeader from '@/components/admin/DashboardHeader'
import { Toaster } from 'sonner'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'

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

  const { restaurant, restaurants } = await getActiveRestaurant(user.id, supabase)

  if (!restaurant) redirect('/auth/onboarding')

  // Sincronizar billing_status en cookie para que el proxy lo lea sin hacer query
  const cookieStore = await cookies()
  const billingStatus = restaurant.billing_status ?? 'active'
  cookieStore.set('billing_status', billingStatus, {
    path:     '/',
    httpOnly: false, // El proxy lo lee desde request.cookies
    sameSite: 'lax',
    maxAge:   60 * 60, // 1 hora; se refresca en cada carga del layout
  })

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar restaurant={restaurant} restaurants={restaurants} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader restaurant={restaurant} restaurants={restaurants} user={user} />
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
