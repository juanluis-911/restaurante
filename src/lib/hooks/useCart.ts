'use client'

import { useState, useCallback } from 'react'

export interface CartItem {
  id: string            // product_id o combo_id
  type: 'product' | 'combo'
  name: string
  price: number         // precio final ya con descuento si aplica
  original_price: number
  quantity: number
  image_url?: string | null
  notes?: string
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.type === item.type)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.type === item.type
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((id: string, type: CartItem['type']) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.type === type)))
  }, [])

  const updateQuantity = useCallback((id: string, type: CartItem['type'], quantity: number) => {
    if (quantity <= 0) {
      removeItem(id, type)
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id && i.type === type ? { ...i, quantity } : i))
    )
  }, [removeItem])

  const updateNotes = useCallback((id: string, type: CartItem['type'], notes: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id && i.type === type ? { ...i, notes } : i))
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateNotes,
    clearCart,
    subtotal,
    totalItems,
    isEmpty: items.length === 0,
  }
}
