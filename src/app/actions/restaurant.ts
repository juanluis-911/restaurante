'use server'

import { cookies } from 'next/headers'

export async function setActiveRestaurant(restaurantId: string) {
  const cookieStore = await cookies()
  cookieStore.set('active_restaurant', restaurantId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
  })
}
