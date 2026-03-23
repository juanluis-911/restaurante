import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderTracker from '@/components/public/OrderTracker'

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export default async function OrderTrackingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, restaurants(name, primary_color, logo_url, phone)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  return <OrderTracker initialOrder={order} />
}
