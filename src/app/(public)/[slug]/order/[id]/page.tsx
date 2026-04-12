import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderTracker from '@/components/public/OrderTracker'


interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function OrderTrackingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: order } = await sb
    .from('orders')
    .select('*, restaurants(name, primary_color, slug, logo_url, phone, cash_enabled, card_enabled, stripe_account_status, stripe_account_id, business_type), drivers(name, whatsapp, vehicle_type)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  return <OrderTracker initialOrder={order} />
}
