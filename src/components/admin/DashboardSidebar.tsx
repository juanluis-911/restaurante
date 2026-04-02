'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  CreditCard,
  Tag,
  BarChart3,
  Settings,
  ExternalLink,
  Menu,
  MoreHorizontal,
  Receipt,
  HelpCircle,
} from 'lucide-react'
import RestaurantSwitcher from '@/components/admin/RestaurantSwitcher'
import type { RestaurantRow } from '@/lib/utils/get-active-restaurant'

const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Inicio',        icon: LayoutDashboard },
  { href: '/dashboard/orders',    label: 'Órdenes',       icon: ShoppingBag },
  { href: '/dashboard/pos',       label: 'POS',           icon: CreditCard },
  { href: '/dashboard/menus',     label: 'Menús',         icon: UtensilsCrossed },
  { href: '/dashboard/discounts', label: 'Descuentos',    icon: Tag },
  { href: '/dashboard/reports',   label: 'Reportes',      icon: BarChart3 },
  { href: '/dashboard/billing',   label: 'Facturación',   icon: Receipt },
  { href: '/dashboard/settings',  label: 'Configuración', icon: Settings },
  { href: '/dashboard/ayuda',     label: 'Ayuda',         icon: HelpCircle },
]

// Primeros 4 en la barra inferior, el resto en "Más"
const BOTTOM_NAV  = NAV_ITEMS.slice(0, 4)
const DRAWER_EXTRA = NAV_ITEMS.slice(4)

interface Props {
  restaurant: RestaurantRow
  restaurants: RestaurantRow[]
}

export default function DashboardSidebar({ restaurant, restaurants }: Props) {
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-card">
        <RestaurantSwitcher restaurants={restaurants} activeRestaurantId={restaurant.id} />

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive(href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-2 py-3 border-t">
          <a
            href={`/${restaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ExternalLink size={16} />
            Ver sitio público
          </a>
        </div>
      </aside>

      {/* ── Mobile: barra inferior ───────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t flex items-stretch h-16 safe-area-inset-bottom">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors',
              isActive(href) ? 'text-primary font-medium' : 'text-muted-foreground'
            )}
          >
            <Icon size={20} strokeWidth={isActive(href) ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        ))}

        {/* Botón "Más" abre sheet */}
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors',
            DRAWER_EXTRA.some((i) => isActive(i.href)) ? 'text-primary font-medium' : 'text-muted-foreground'
          )}
        >
          <MoreHorizontal size={20} strokeWidth={1.8} />
          <span>Más</span>
        </button>
      </nav>

      {/* ── Mobile: Sheet con el resto de opciones ──────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="sr-only">Menú</SheetTitle>
            <RestaurantSwitcher restaurants={restaurants} activeRestaurantId={restaurant.id} />
          </SheetHeader>

          <nav className="mt-2 space-y-1">
            {DRAWER_EXTRA.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors',
                  isActive(href)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            <a
              href={`/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ExternalLink size={18} />
              Ver sitio público
            </a>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
