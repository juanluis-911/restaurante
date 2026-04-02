import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'
import BillingCard from '@/components/admin/BillingCard'
import StripeConnectCard from '@/components/admin/StripeConnectCard'

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Facturación</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestiona tu suscripción a TuriEats y tu cuenta de pagos Stripe
        </p>
      </div>

      <BillingCard restaurant={restaurant} />
      <StripeConnectCard restaurant={restaurant} />
    </div>
  )
}
