'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/helpers'
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import { MapPin, Package, CheckCircle2, LogOut, Bike, Car, Zap, Clock, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Driver = {
  id: string
  name: string
  whatsapp: string
  vehicle_type: 'moto' | 'carro' | 'bicicleta'
  status: 'available' | 'busy' | 'offline'
}

type Order = {
  id: string
  restaurant_id: string
  customer_name: string
  total: number
  delivery_address: { street?: string; neighborhood?: string; city?: string; references?: string } | null
  created_at: string
  status: string
  driver_id: string | null
  stripe_session_id: string | null
  restaurants: { name: string; primary_color: string; slug: string } | null
}

const VEHICLE_ICONS = { moto: Zap, carro: Car, bicicleta: Bike }
const VEHICLE_LABELS = { moto: 'Moto', carro: 'Carro', bicicleta: 'Bicicleta' }

// Estado del pedido visible para el driver
const KITCHEN_STATUS: Record<string, { label: string; desc: string; bg: string; text: string }> = {
  accepted:   { label: 'En cola',    desc: 'El restaurante lo tiene en la cola',     bg: 'bg-blue-50',   text: 'text-blue-700'   },
  preparing:  { label: 'Preparando', desc: 'Se está preparando tu pedido',           bg: 'bg-orange-50', text: 'text-orange-700' },
  ready:      { label: '¡Listo!',    desc: 'Ve al restaurante a recogerlo',          bg: 'bg-green-50',  text: 'text-green-700'  },
  on_the_way: { label: 'En camino',  desc: 'Ya lo tienes, llévalo al cliente',       bg: 'bg-purple-50', text: 'text-purple-700' },
}

const STATUS_STEPS = ['accepted', 'preparing', 'ready', 'on_the_way']

interface Props {
  driver: Driver
  availableOrders: Order[]
  activeOrder: Order | null
}

export default function DriverDashboard({ driver: initialDriver, availableOrders: initialOrders, activeOrder: initialActive }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [driver, setDriver]           = useState(initialDriver)
  const [available, setAvailable]     = useState(initialOrders)
  const [activeOrder, setActiveOrder] = useState<Order | null>(initialActive)
  const [claiming, setClaiming]       = useState<string | null>(null)
  const [delivering, setDelivering]   = useState(false)

  const VehicleIcon = VEHICLE_ICONS[driver.vehicle_type]

  // Sincronizar con nuevas props cuando el servidor refresca
  useEffect(() => { setAvailable(initialOrders) }, [initialOrders])
  useEffect(() => { setActiveOrder(initialActive) }, [initialActive])

  // ── Realtime: escuchar cambios en pedidos ─────────────────
  useEffect(() => {
    const channel = supabase
      .channel('driver-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `order_type=eq.delivery`,
      }, () => {
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, router])

  // ── Toggle disponibilidad ─────────────────────────────────
  async function toggleStatus() {
    const next = driver.status === 'offline' ? 'available' : 'offline'
    const { error } = await supabase.from('drivers').update({ status: next }).eq('id', driver.id)
    if (!error) setDriver((d) => ({ ...d, status: next }))
  }

  // ── Tomar un pedido (solo asigna driver_id, no cambia status) ──
  const claimOrder = useCallback(async (orderId: string) => {
    setClaiming(orderId)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: orderErr } = await (supabase as any)
        .from('orders')
        .update({ driver_id: driver.id })
        .eq('id', orderId)
        .is('driver_id', null)

      if (orderErr) { toast.error('El pedido ya fue tomado'); return }

      await supabase.from('drivers').update({ status: 'busy' }).eq('id', driver.id)
      setDriver((d) => ({ ...d, status: 'busy' }))

      // Actualizar estado local inmediatamente
      const claimed = available.find((o) => o.id === orderId) ?? null
      setAvailable((prev) => prev.filter((o) => o.id !== orderId))
      if (claimed) setActiveOrder({ ...claimed, driver_id: driver.id })

      toast.success('¡Pedido tomado! Dirígete al restaurante.')
      router.refresh()
    } catch {
      toast.error('Error al tomar el pedido')
    } finally {
      setClaiming(null)
    }
  }, [driver.id, supabase, router, available])

  // ── Marcar como entregado ─────────────────────────────────
  async function markDelivered() {
    if (!activeOrder) return
    setDelivering(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('orders').update({ status: 'delivered' }).eq('id', activeOrder.id)
      await supabase.from('drivers').update({ status: 'available' }).eq('id', driver.id)
      setDriver((d) => ({ ...d, status: 'available' }))
      setActiveOrder(null)
      toast.success('¡Entregado! Listo para el siguiente.')
      router.refresh()
    } catch {
      toast.error('Error al marcar como entregado')
    } finally {
      setDelivering(false)
    }
  }

  // ── Cerrar sesión ─────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/driver/login')
  }

  const isOnline = driver.status !== 'offline'
  const statusInfo = activeOrder ? (KITCHEN_STATUS[activeOrder.status] ?? null) : null
  const currentStep = activeOrder ? STATUS_STEPS.indexOf(activeOrder.status) : -1

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <VehicleIcon size={18} />
            </div>
            <div>
              <p className="font-semibold leading-tight">{driver.name}</p>
              <p className="text-xs text-slate-400">{VEHICLE_LABELS[driver.vehicle_type]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isOnline ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
              {isOnline ? 'En línea' : 'Fuera de línea'}
            </button>

            <button onClick={handleLogout} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Pedido asignado ─────────────────────────────── */}
        {activeOrder && statusInfo && (
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
            {/* Banner de estado */}
            <div className={`px-4 py-2 flex items-center justify-between ${statusInfo.bg}`}>
              <div className="flex items-center gap-2">
                <Package size={15} className={statusInfo.text} />
                <span className={`text-sm font-semibold ${statusInfo.text}`}>{statusInfo.label}</span>
              </div>
              <span className={`text-xs ${statusInfo.text}`}>{statusInfo.desc}</span>
            </div>

            {/* Barra de progreso */}
            <div className="flex px-4 pt-3 gap-1">
              {STATUS_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentStep ? 'bg-slate-800' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex px-4 pt-1 pb-3 gap-1">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className={`flex-1 text-center text-[10px] ${i <= currentStep ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                  {step === 'accepted' ? 'Cola' : step === 'preparing' ? 'Cocina' : step === 'ready' ? 'Listo' : 'Camino'}
                </div>
              ))}
            </div>

            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{activeOrder.restaurants?.name}</p>
                  <p className="text-sm text-muted-foreground">Para: {activeOrder.customer_name}</p>
                  {activeOrder.stripe_session_id && (
                    <span className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 rounded-full px-2 py-0.5 mt-1">
                      💳 Pagado con tarjeta
                    </span>
                  )}
                </div>
                <span className="font-bold text-lg">{formatCurrency(Number(activeOrder.total))}</span>
              </div>

              {activeOrder.delivery_address && (
                <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
                  <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{activeOrder.delivery_address.street}</p>
                    {activeOrder.delivery_address.neighborhood && (
                      <p className="text-muted-foreground">{activeOrder.delivery_address.neighborhood}</p>
                    )}
                    <p className="text-muted-foreground">{activeOrder.delivery_address.city}</p>
                    {activeOrder.delivery_address.references && (
                      <p className="text-muted-foreground text-xs mt-1 italic">{activeOrder.delivery_address.references}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Botón entregado solo cuando está en camino */}
              {activeOrder.status === 'on_the_way' ? (
                <Button className="w-full bg-green-600 hover:bg-green-700 gap-2" onClick={markDelivered} disabled={delivering}>
                  <CheckCircle2 size={16} />
                  {delivering ? 'Marcando...' : 'Marcar como entregado'}
                </Button>
              ) : (
                <p className="text-xs text-center text-muted-foreground pt-1">
                  El restaurante marcará el pedido "En camino" cuando lo recibas
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Lista de pedidos disponibles ──────────────────── */}
        {!activeOrder && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                {isOnline ? 'Pedidos disponibles' : 'Estás fuera de línea'}
              </h2>
              {isOnline && available.length > 0 && (
                <span className="text-xs bg-slate-900 text-white font-medium px-2 py-0.5 rounded-full">
                  {available.length}
                </span>
              )}
            </div>

            {!isOnline ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-sm">Activa "En línea" para ver pedidos disponibles.</p>
                <button onClick={toggleStatus} className="mt-3 text-sm font-medium text-slate-900 underline">
                  Ponerme en línea
                </button>
              </div>
            ) : available.length === 0 ? (
              <div className="text-center py-16">
                <Clock size={36} className="text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Esperando pedidos...</p>
                <p className="text-xs text-muted-foreground mt-1">Te notificaremos cuando haya uno disponible.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {available.map((order) => (
                  <div key={order.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="h-1.5" style={{ backgroundColor: order.restaurants?.primary_color ?? '#64748b' }} />
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{order.restaurants?.name}</p>
                          <p className="text-sm text-muted-foreground">Para: {order.customer_name}</p>
                          {order.stripe_session_id && (
                            <span className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 rounded-full px-2 py-0.5 mt-1">
                              💳 Pagado con tarjeta
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-base">{formatCurrency(Number(order.total))}</span>
                      </div>

                      {order.delivery_address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin size={13} className="mt-0.5 shrink-0" />
                          <span>
                            {order.delivery_address.street}
                            {order.delivery_address.neighborhood ? `, ${order.delivery_address.neighborhood}` : ''}
                            {order.delivery_address.city ? `, ${order.delivery_address.city}` : ''}
                          </span>
                        </div>
                      )}

                      <Button
                        className="w-full gap-2"
                        style={{ backgroundColor: order.restaurants?.primary_color ?? '#0f172a' }}
                        onClick={() => claimOrder(order.id)}
                        disabled={!!claiming}
                      >
                        {claiming === order.id ? 'Tomando...' : 'Tomar pedido'}
                        <ChevronRight size={15} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
