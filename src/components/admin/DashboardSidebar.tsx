'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  ChefHat,
  CreditCard,
  Tag,
  BarChart3,
  Settings,
  ExternalLink,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',             label: 'Inicio',      icon: LayoutDashboard },
  { href: '/dashboard/orders',      label: 'Pedidos',     icon: ShoppingBag },
  { href: '/dashboard/kitchen',     label: 'Cocina',      icon: ChefHat },
  { href: '/dashboard/pos',         label: 'POS',         icon: CreditCard },
  { href: '/dashboard/menus',       label: 'Menús',       icon: UtensilsCrossed },
  { href: '/dashboard/discounts',   label: 'Descuentos',  icon: Tag },
  { href: '/dashboard/reports',     label: 'Reportes',    icon: BarChart3 },
  { href: '/dashboard/settings',    label: 'Configuración', icon: Settings },
]

interface Props {
  restaurant: {
    name: string
    slug: string
    logo_url?: string | null
    primary_color: string
  }
}

export default function DashboardSidebar({ restaurant }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-60 flex-col border-r bg-card">
      {/* Logo / Nombre */}
      <div className="flex items-center gap-3 px-4 py-5 border-b">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-sm font-semibold shrink-0"
          style={{ backgroundColor: restaurant.primary_color }}
        >
          {restaurant.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{restaurant.name}</p>
          <p className="text-xs text-muted-foreground truncate">Panel admin</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Ver sitio público */}
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
  )
}
