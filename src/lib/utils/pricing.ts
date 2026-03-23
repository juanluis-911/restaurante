export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

export function calcDiscount(
  price: number,
  type: 'percentage' | 'fixed' | 'combo_price',
  value: number
): number {
  if (type === 'percentage') return price * (value / 100)
  if (type === 'fixed') return Math.min(value, price)
  if (type === 'combo_price') return Math.max(0, price - value)
  return 0
}

export function calcOrderTotals(
  items: { unit_price: number; quantity: number; discount_amount?: number }[],
  deliveryFee = 0
) {
  const subtotal = items.reduce(
    (sum, i) => sum + i.unit_price * i.quantity,
    0
  )
  const discountAmount = items.reduce(
    (sum, i) => sum + (i.discount_amount ?? 0) * i.quantity,
    0
  )
  const total = Math.max(0, subtotal - discountAmount) + deliveryFee
  return { subtotal, discountAmount, total }
}
