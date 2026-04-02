import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Stripe from 'stripe'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICE_ONLINE   = 5    // MXN por pedido del storefront
const PRICE_POS      = 0.5  // MXN por pedido POS
const WEEKLY_MINIMUM = 100  // MXN

function adminClient() {
  return createSupabaseAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getPreviousWeekRange(): { start: string; end: string } {
  // Obtener el lunes anterior (semana que acaba de cerrar)
  const now       = new Date()
  const dayOfWeek = now.getDay() // 0=dom, 1=lun, ...
  // Retroceder al lunes anterior
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) + 6))
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split('T')[0],
    end:   sunday.toISOString().split('T')[0],
  }
}

export async function POST(request: NextRequest) {
  // Verificar el secret del cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const { start, end } = getPreviousWeekRange()

  // Obtener todos los periodos de la semana anterior con status 'open'
  const { data: periods, error: periodsError } = await supabase
    .from('billing_periods')
    .select('*, restaurants(id, name, owner_id, billing_status, stripe_customer_id)')
    .eq('week_start', start)
    .eq('status', 'open')

  if (periodsError) {
    return Response.json({ error: periodsError.message }, { status: 500 })
  }

  const results: { restaurant_id: string; status: string; amount?: number; error?: string }[] = []

  for (const period of (periods ?? [])) {
    const restaurant = period.restaurants as {
      id: string; name: string; owner_id: string;
      billing_status: string; stripe_customer_id: string | null
    } | null

    if (!restaurant) continue

    const posCount   = (period as { pos_order_count?: number }).pos_order_count ?? 0
    const amountOwed = Math.max(period.order_count * PRICE_ONLINE + posCount * PRICE_POS, WEEKLY_MINIMUM)

    try {
      // Obtener email del owner para crear/recuperar Stripe Customer
      const { data: { user } } = await createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      ).auth.admin.getUserById(restaurant.owner_id)

      const ownerEmail = user?.email ?? ''

      // Crear o recuperar Stripe Customer
      let customerId = restaurant.stripe_customer_id
      if (!customerId) {
        const customer = await stripe.customers.create({
          email:    ownerEmail,
          name:     restaurant.name,
          metadata: { restaurant_id: restaurant.id },
        })
        customerId = customer.id

        await supabase
          .from('restaurants')
          .update({ stripe_customer_id: customerId })
          .eq('id', restaurant.id)
      }

      // Crear factura en Stripe
      const invoice = await stripe.invoices.create({
        customer:             customerId,
        collection_method:    'send_invoice',
        days_until_due:       3,
        currency:             'mxn',
        description:          `TuriEats — Semana ${start} al ${end} (${period.order_count} online + ${posCount} POS)`,
        metadata:             { restaurant_id: restaurant.id, week_start: start },
        auto_advance:         true,
      })

      // Agregar línea de factura
      await stripe.invoiceItems.create({
        customer:    customerId,
        invoice:     invoice.id,
        amount:      amountOwed * 100, // Stripe usa centavos
        currency:    'mxn',
        description: `Comisión semanal: ${period.order_count} online × $${PRICE_ONLINE} + ${posCount} POS × $${PRICE_POS} (mínimo $${WEEKLY_MINIMUM} MXN)`,
      })

      // Finalizar y enviar la factura
      const finalInvoice = await stripe.invoices.finalizeInvoice(invoice.id)
      await stripe.invoices.sendInvoice(finalInvoice.id)

      const paymentUrl = finalInvoice.hosted_invoice_url ?? ''

      // Actualizar billing_period
      await supabase
        .from('billing_periods')
        .update({
          status:             'invoiced',
          amount_owed:        amountOwed,
          stripe_invoice_id:  finalInvoice.id,
          stripe_payment_url: paymentUrl,
        })
        .eq('id', period.id)

      // Suspender el restaurante
      await supabase
        .from('restaurants')
        .update({ billing_status: 'suspended' })
        .eq('id', restaurant.id)

      results.push({ restaurant_id: restaurant.id, status: 'invoiced', amount: amountOwed })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      results.push({ restaurant_id: restaurant.id, status: 'error', error: message })
    }
  }

  // Crear periodos vacíos para la semana nueva (lunes actual)
  const { data: activeRestaurants } = await supabase
    .from('restaurants')
    .select('id')
    .eq('is_active', true)

  if (activeRestaurants) {
    const today       = new Date()
    const dayOfWeek   = today.getDay()
    const thisMonday  = new Date(today)
    thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    thisMonday.setHours(0, 0, 0, 0)

    const thisSunday = new Date(thisMonday)
    thisSunday.setDate(thisMonday.getDate() + 6)

    const newWeekStart = thisMonday.toISOString().split('T')[0]
    const newWeekEnd   = thisSunday.toISOString().split('T')[0]

    const newPeriods = activeRestaurants.map((r) => ({
      restaurant_id: r.id,
      week_start:    newWeekStart,
      week_end:      newWeekEnd,
      order_count:   0,
      amount_owed:   0,
      status:        'open',
    }))

    // Upsert: si ya existe (el trigger ya lo creó con un pedido), no sobreescribir
    await supabase
      .from('billing_periods')
      .upsert(newPeriods, { onConflict: 'restaurant_id,week_start', ignoreDuplicates: true })
  }

  return Response.json({ ok: true, processed: results.length, results })
}
