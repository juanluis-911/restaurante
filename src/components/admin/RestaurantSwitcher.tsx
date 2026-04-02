'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { setActiveRestaurant } from '@/app/actions/restaurant'
import type { RestaurantRow } from '@/lib/utils/get-active-restaurant'

interface Props {
  restaurants: RestaurantRow[]
  activeRestaurantId: string
  /** Variante compacta para el header en mobile */
  compact?: boolean
}

export default function RestaurantSwitcher({ restaurants, activeRestaurantId, compact }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const active = restaurants.find((r) => r.id === activeRestaurantId) ?? restaurants[0]

  function handleSelect(restaurantId: string) {
    if (restaurantId === activeRestaurantId) { setOpen(false); return }
    setOpen(false)
    startTransition(async () => {
      await setActiveRestaurant(restaurantId)
      router.refresh()
    })
  }

  // Si solo hay un restaurante, mostrar estático sin dropdown
  if (restaurants.length === 1) {
    if (compact) {
      return (
        <span className="font-semibold text-sm truncate max-w-[60vw]">{active.name}</span>
      )
    }
    return (
      <div className="flex items-center gap-3 px-4 py-5 border-b">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-sm font-semibold shrink-0"
          style={{ backgroundColor: active.primary_color }}
        >
          {active.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{active.name}</p>
          <p className="text-xs text-muted-foreground">Panel admin</p>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 font-semibold text-sm truncate max-w-[60vw]"
        >
          <span className="truncate">{active.name}</span>
          <ChevronsUpDown size={13} className="text-muted-foreground shrink-0" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border bg-popover shadow-lg overflow-hidden">
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  disabled={isPending}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted',
                    r.id === activeRestaurantId && 'bg-muted/60'
                  )}
                >
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md text-white text-xs font-semibold shrink-0"
                    style={{ backgroundColor: r.primary_color }}
                  >
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left truncate">{r.name}</span>
                  {r.id === activeRestaurantId && <Check size={13} className="shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-5 border-b hover:bg-muted/50 transition-colors"
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white text-sm font-semibold shrink-0"
          style={{ backgroundColor: active.primary_color }}
        >
          {active.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-medium text-sm truncate">{active.name}</p>
          <p className="text-xs text-muted-foreground">Panel admin</p>
        </div>
        <ChevronsUpDown size={14} className="text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-2 right-2 top-full z-20 mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden">
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelect(r.id)}
                disabled={isPending}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted',
                  r.id === activeRestaurantId && 'bg-muted/60'
                )}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: r.primary_color }}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-left truncate">{r.name}</span>
                {r.id === activeRestaurantId && <Check size={13} className="shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
