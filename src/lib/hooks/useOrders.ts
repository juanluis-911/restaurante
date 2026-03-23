'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

type Order = Database['public']['Tables']['orders']['Row']

interface UseOrdersOptions {
  restaurantId: string
  statuses?: Order['status'][]
}

export function useOrders({ restaurantId, statuses }: UseOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses)
    }

    const { data } = await query
    if (data) setOrders(data)
    setLoading(false)
  }, [supabase, restaurantId, statuses])

  useEffect(() => {
    fetchOrders()

    const channel = supabase
      .channel(`use-orders:${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => fetchOrders())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurantId, fetchOrders, supabase])

  async function updateStatus(orderId: string, status: Order['status']) {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
    return !error
  }

  return { orders, loading, updateStatus, refetch: fetchOrders }
}
