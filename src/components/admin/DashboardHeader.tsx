'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LogOut, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import RestaurantSwitcher from '@/components/admin/RestaurantSwitcher'
import type { RestaurantRow } from '@/lib/utils/get-active-restaurant'

interface Props {
  restaurant: RestaurantRow
  restaurants: RestaurantRow[]
  user: SupabaseUser
}

export default function DashboardHeader({ restaurant, restaurants, user }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      {/* Selector de restaurante en mobile */}
      <div className="md:hidden">
        <RestaurantSwitcher restaurants={restaurants} activeRestaurantId={restaurant.id} compact />
      </div>
      <div className="hidden md:block" />

      {/* Acciones del usuario */}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <span className="relative h-8 w-8 rounded-full cursor-pointer inline-flex">
            <Avatar className="h-8 w-8">
              <AvatarFallback
                style={{ backgroundColor: restaurant.primary_color }}
                className="text-white text-xs"
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-2 py-1.5">
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <a href="/dashboard/settings" className="cursor-pointer">
              <User size={14} className="mr-2" />
              Configuración
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut size={14} className="mr-2" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
