/**
 * Formatea un número como moneda MXN
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

/**
 * Calcula el precio con descuento aplicado
 * @param price  Precio original
 * @param type   'percentage' | 'fixed'
 * @param value  Valor del descuento
 */
export function applyDiscount(
  price: number,
  type: 'percentage' | 'fixed' | 'combo_price',
  value: number
): number {
  if (type === 'percentage') {
    return Math.max(0, price - (price * value) / 100)
  }
  if (type === 'fixed') {
    return Math.max(0, price - value)
  }
  if (type === 'combo_price') {
    return Math.max(0, value) // precio directo del combo
  }
  return price
}

/**
 * Calcula el total de un carrito de items
 */
export function calculateCartTotal(
  items: { quantity: number; unit_price: number; discount_amount?: number }[]
): { subtotal: number; discount: number; total: number } {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const discount = items.reduce((s, i) => s + (i.discount_amount ?? 0) * i.quantity, 0)
  return { subtotal, discount, total: subtotal - discount }
}

/**
 * Verifica si el restaurante está abierto en este momento
 */
export function isRestaurantOpen(
  hours: { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }[],
  timezone: string
): boolean {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
  const day = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const todayHours = hours.find((h) => h.day_of_week === day)
  if (!todayHours || todayHours.is_closed) return false
  if (!todayHours.open_time || !todayHours.close_time) return false

  const [openH, openM] = todayHours.open_time.split(':').map(Number)
  const [closeH, closeM] = todayHours.close_time.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

/**
 * Genera un slug URL-amigable
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Genera un código de cupón aleatorio
 */
export function generateCouponCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
