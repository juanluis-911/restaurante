'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils/helpers'
import { ShoppingCart, Clock, Phone } from 'lucide-react'
import type { Database } from '@/types/database'

type Restaurant = Database['public']['Tables']['restaurants']['Row']
type Menu = Database['public']['Tables']['menus']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type Product = Database['public']['Tables']['products']['Row']
type Combo = Database['public']['Tables']['combos']['Row']
type Discount = Database['public']['Tables']['discounts']['Row']

interface Props {
  restaurant: Restaurant
  isOpen: boolean
  menus: Menu[]
  categories: Category[]
  products: Product[]
  combos: Combo[]
  discounts: Discount[]
}

export default function StorefrontClient({
  restaurant,
  isOpen,
  menus,
  categories,
  products,
  combos,
}: Props) {
  const [activeMenuId, setActiveMenuId] = useState(menus[0]?.id ?? null)
  const cart = useCart()

  const menuCategories = categories.filter((c) => c.menu_id === activeMenuId)

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ '--color-primary': restaurant.primary_color } as React.CSSProperties}
    >
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: restaurant.primary_color }}
              >
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isOpen ? 'default' : 'secondary'}
                  className={`text-xs ${isOpen ? 'bg-green-500 hover:bg-green-500' : ''}`}
                >
                  {isOpen ? 'Abierto' : 'Cerrado'}
                </Badge>
                {restaurant.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone size={10} /> {restaurant.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Carrito */}
          {cart.totalItems > 0 && (
            <Button
              size="sm"
              style={{ backgroundColor: restaurant.primary_color }}
              className="relative gap-2"
            >
              <ShoppingCart size={14} />
              <span>{cart.totalItems}</span>
              <span className="hidden sm:inline">{formatCurrency(cart.subtotal)}</span>
            </Button>
          )}
        </div>

        {/* Tabs de menús */}
        {menus.length > 1 && (
          <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
            {menus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => setActiveMenuId(menu.id)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeMenuId === menu.id
                    ? 'text-white font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeMenuId === menu.id ? { backgroundColor: restaurant.primary_color } : {}}
              >
                {menu.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Contenido */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {!isOpen && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Clock size={18} className="text-orange-500 shrink-0" />
            <p className="text-sm text-orange-800">
              El restaurante está cerrado en este momento. Puedes ver el menú pero no realizar pedidos.
            </p>
          </div>
        )}

        {menuCategories.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">🍽️</p>
            <p>No hay productos disponibles en este menú</p>
          </div>
        )}

        {menuCategories.map((category) => {
          const categoryProducts = products.filter((p) => p.category_id === category.id)
          const categoryProducts2 = categoryProducts.length === 0 ? [] : categoryProducts

          return (
            <section key={category.id} className="mb-8">
              <h2 className="text-lg font-bold mb-3 pb-2 border-b">{category.name}</h2>
              {category.description && (
                <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
              )}
              <div className="space-y-3">
                {categoryProducts2.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border p-3 flex gap-3 hover:shadow-sm transition-shadow"
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {product.description}
                        </p>
                      )}
                      {product.preparation_time_min && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock size={10} /> ~{product.preparation_time_min} min
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-bold" style={{ color: restaurant.primary_color }}>
                          {formatCurrency(Number(product.price))}
                        </p>
                        <Button
                          size="sm"
                          onClick={() =>
                            cart.addItem({
                              id: product.id,
                              type: 'product',
                              name: product.name,
                              price: Number(product.price),
                              original_price: Number(product.price),
                              image_url: product.image_url,
                            })
                          }
                          disabled={!isOpen}
                          className="h-7 text-xs"
                          style={{ backgroundColor: restaurant.primary_color }}
                        >
                          + Agregar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {/* Combos */}
        {combos.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-3 pb-2 border-b flex items-center gap-2">
              Combos
              <Badge variant="secondary" className="text-xs">Ahorra más</Badge>
            </h2>
            <div className="space-y-3">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="bg-white rounded-xl border-2 p-3 flex gap-3 hover:shadow-sm transition-shadow"
                  style={{ borderColor: restaurant.primary_color + '40' }}
                >
                  {combo.image_url && (
                    <img
                      src={combo.image_url}
                      alt={combo.name}
                      className="w-20 h-20 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{combo.name}</p>
                      <Badge className="text-xs" style={{ backgroundColor: restaurant.primary_color }}>
                        Combo
                      </Badge>
                    </div>
                    {combo.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {combo.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-bold" style={{ color: restaurant.primary_color }}>
                        {formatCurrency(Number(combo.price))}
                      </p>
                      <Button
                        size="sm"
                        onClick={() =>
                          cart.addItem({
                            id: combo.id,
                            type: 'combo',
                            name: combo.name,
                            price: Number(combo.price),
                            original_price: Number(combo.price),
                            image_url: combo.image_url,
                          })
                        }
                        disabled={!isOpen}
                        className="h-7 text-xs"
                        style={{ backgroundColor: restaurant.primary_color }}
                      >
                        + Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* FAB carrito (mobile) */}
      {cart.totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 sm:hidden">
          <Button
            className="shadow-lg gap-2 px-6 py-3 rounded-full text-sm"
            style={{ backgroundColor: restaurant.primary_color }}
          >
            <ShoppingCart size={16} />
            Ver carrito · {formatCurrency(cart.subtotal)}
            <Badge variant="secondary" className="ml-1 text-xs">
              {cart.totalItems}
            </Badge>
          </Button>
        </div>
      )}
    </div>
  )
}
