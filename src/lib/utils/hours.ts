interface Hour {
  day_of_week: number
  open_time: string | null
  close_time: string | null
  is_closed: boolean
}

/**
 * Verifica si el restaurante está abierto ahora mismo
 * Usa la timezone del restaurante, no la del cliente
 */
export function isRestaurantOpen(
  hours: Hour[],
  timezone: string
): boolean {
  const now = new Date()

  // Obtener la hora actual en la timezone del restaurante
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const dayStr = parts.find((p) => p.type === 'weekday')?.value
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0')

  const DAY_MAP: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }

  const dayOfWeek = DAY_MAP[dayStr ?? 'Sun'] ?? 0
  const todayHours = hours.find((h) => h.day_of_week === dayOfWeek)

  if (!todayHours || todayHours.is_closed) return false
  if (!todayHours.open_time || !todayHours.close_time) return false

  const [openH, openM] = todayHours.open_time.split(':').map(Number)
  const [closeH, closeM] = todayHours.close_time.split(':').map(Number)

  const currentMinutes = hour * 60 + minute
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}
