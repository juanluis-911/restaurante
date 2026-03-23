import { z } from 'zod'

export const restaurantSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  phone: z.string().optional(),
  address: z.string().optional(),
  timezone: z.string(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  category_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  preparation_time_min: z.number().int().positive().optional(),
  allergens: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
})

export const orderCheckoutSchema = z.object({
  customer_name: z.string().min(2, 'El nombre es requerido'),
  customer_phone: z.string().min(10, 'Teléfono inválido'),
  customer_email: z.string().email().optional().or(z.literal('')),
  order_type: z.enum(['dine_in', 'pickup', 'delivery']),
  notes: z.string().optional(),
  coupon_code: z.string().optional(),
  delivery_address: z
    .object({
      street: z.string(),
      neighborhood: z.string().optional(),
      city: z.string(),
      references: z.string().optional(),
    })
    .optional(),
})

export const discountSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['percentage', 'fixed', 'combo_price']),
  value: z.number().min(0),
  scope: z.enum(['all', 'category', 'product', 'combo']),
  target_ids: z.array(z.string().uuid()).default([]),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
  max_uses: z.number().int().positive().optional(),
  is_active: z.boolean().default(true),
})

export const couponSchema = z.object({
  code: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(20)
    .regex(/^[A-Z0-9]+$/, 'Solo mayúsculas y números'),
  discount_id: z.string().uuid(),
  usage_type: z.enum(['single_use', 'per_user', 'until_date', 'unlimited']),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().optional(),
  is_active: z.boolean().default(true),
})

export type RestaurantFormData  = z.infer<typeof restaurantSchema>
export type ProductFormData     = z.infer<typeof productSchema>
export type OrderCheckoutData   = z.infer<typeof orderCheckoutSchema>
export type DiscountFormData    = z.infer<typeof discountSchema>
export type CouponFormData      = z.infer<typeof couponSchema>
