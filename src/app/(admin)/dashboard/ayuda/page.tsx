import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getActiveRestaurant } from '@/lib/utils/get-active-restaurant'
import {
  UserPlus,
  Store,
  CreditCard,
  CheckCircle2,
  Receipt,
  ChevronRight,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  BadgeCheck,
} from 'lucide-react'

export default async function AyudaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { restaurant } = await getActiveRestaurant(user.id, supabase)
  if (!restaurant) redirect('/auth/onboarding')

  return (
    <div className="space-y-8 max-w-3xl pb-8">

      {/* ── Encabezado ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold">Centro de ayuda</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Todo lo que necesitas saber para configurar y operar tu restaurante.
        </p>
      </div>

      {/* ── Pasos de configuración ──────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-3">Pasos de configuración</h2>

        <div className="space-y-3">

          {/* Paso 1 */}
          <div className="flex gap-4 rounded-xl border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlus size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">1. Crear tu cuenta</p>
              <p className="text-muted-foreground text-sm mt-0.5">
                Regístrate con correo y contraseña, o con Google. Selecciona el rol
                <strong> Dueño de restaurante</strong> al momento de registrarte.
              </p>
            </div>
            <CheckCircle2 size={18} className="shrink-0 text-green-500 mt-0.5" />
          </div>

          {/* Paso 2 */}
          <div className="flex gap-4 rounded-xl border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Store size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">2. Configurar tu restaurante</p>
              <p className="text-muted-foreground text-sm mt-0.5">
                El asistente de registro te guiará en dos pasos: nombre y URL pública (único en la
                plataforma), zona horaria, teléfono y dirección.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><ChevronRight size={12} /> Nombre del restaurante</span>
                <span className="flex items-center gap-1.5"><ChevronRight size={12} /> URL pública única</span>
                <span className="flex items-center gap-1.5"><ChevronRight size={12} /> Zona horaria</span>
                <span className="flex items-center gap-1.5"><ChevronRight size={12} /> Teléfono y dirección</span>
              </div>
            </div>
            <CheckCircle2 size={18} className="shrink-0 text-green-500 mt-0.5" />
          </div>

          {/* Paso 3 */}
          <div className="flex gap-4 rounded-xl border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <CreditCard size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">3. Conectar Stripe</p>
              <p className="text-muted-foreground text-sm mt-0.5">
                Necesario para recibir pagos en línea. Ve a{' '}
                <strong>Configuración → Stripe</strong> y haz clic en{' '}
                <em>Conectar cuenta de Stripe</em>.
              </p>
              <p className="text-muted-foreground text-xs mt-1.5">
                Stripe te pedirá información personal, datos del negocio y tu CLABE bancaria.
                La verificación puede tardar hasta 24 horas.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Estados de Stripe ──────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-3">Estados de tu cuenta Stripe</h2>

        <div className="rounded-xl border bg-card divide-y overflow-hidden">

          <div className="flex items-start gap-3 p-4">
            <WifiOff size={18} className="shrink-0 text-muted-foreground mt-0.5" />
            <div>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                No conectado
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                No has vinculado ninguna cuenta de Stripe. Los clientes no podrán pagar en línea.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4">
            <Clock size={18} className="shrink-0 text-amber-500 mt-0.5" />
            <div>
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Pendiente
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                Enviaste el formulario pero Stripe aún no ha verificado tu información. Vuelve a
                intentarlo en unas horas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4">
            <BadgeCheck size={18} className="shrink-0 text-green-500 mt-0.5" />
            <div>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Activo
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                Todo en orden. Tus clientes pueden pagar con tarjeta y los fondos llegan directo a
                tu cuenta de Stripe.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Cómo fluye el dinero ───────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-3">Cómo fluye el dinero</h2>

        <div className="rounded-xl border bg-card p-4">
          <ol className="relative border-l border-muted-foreground/20 ml-3 space-y-4">
            {[
              { label: 'El cliente elige productos y paga con tarjeta en línea.' },
              { label: 'Stripe procesa el pago de forma segura.' },
              { label: 'El dinero se deposita directamente en tu cuenta de Stripe.' },
              { label: 'La plataforma cobra su comisión semanalmente por separado (no descuenta de cada pago).' },
            ].map((step, i) => (
              <li key={i} className="pl-4">
                <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">{step.label}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Facturación ───────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-3">Facturación y tarifas</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">

          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">$5</p>
            <p className="text-xs text-muted-foreground mt-1">MXN por pedido<br />en línea</p>
          </div>

          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">$0.50</p>
            <p className="text-xs text-muted-foreground mt-1">MXN por pedido<br />POS</p>
          </div>

          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">$100</p>
            <p className="text-xs text-muted-foreground mt-1">MXN mínimo<br />semanal</p>
          </div>

        </div>

        <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Receipt size={15} className="shrink-0 mt-0.5 text-foreground" />
            <span>El ciclo de facturación va de <strong className="text-foreground">lunes a domingo</strong>. Cada lunes se genera una factura por la semana anterior.</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={15} className="shrink-0 mt-0.5 text-foreground" />
            <span>Tienes <strong className="text-foreground">3 días</strong> para pagar la factura. Recibirás el cobro por correo desde Stripe.</span>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <span>Si la factura vence sin pagarse, tu restaurante queda <strong className="text-foreground">suspendido</strong> hasta que se confirme el pago.</span>
          </div>
        </div>

      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold mb-3">Preguntas frecuentes</h2>

        <div className="rounded-xl border bg-card divide-y overflow-hidden">
          {[
            {
              q: '¿Puedo tener varios restaurantes con la misma cuenta?',
              a: 'Actualmente cada cuenta está vinculada a un restaurante.',
            },
            {
              q: '¿Qué pasa si ya tengo una cuenta Stripe?',
              a: 'El proceso crea o conecta una cuenta de Stripe nueva. Si tienes dudas, contacta al soporte de la plataforma.',
            },
            {
              q: '¿Cómo desconecto Stripe?',
              a: 'En Configuración → Stripe, haz clic en Desconectar. Esto desvincula la cuenta de la plataforma, pero no la elimina de Stripe.',
            },
            {
              q: '¿Puedo cambiar mi URL pública después?',
              a: 'Sí, desde Configuración. Ten en cuenta que los links anteriores dejarán de funcionar.',
            },
            {
              q: '¿Los pedidos POS generan comisión?',
              a: 'Sí, $0.50 MXN por pedido. Son los pedidos capturados manualmente por el staff cuando el cliente paga en efectivo u otro medio presencial.',
            },
            {
              q: '¿Cómo sé que un pago en línea fue exitoso?',
              a: 'El pedido aparece en el panel con el estado Recibido tan pronto Stripe confirma el pago.',
            },
          ].map(({ q, a }, i) => (
            <div key={i} className="p-4">
              <p className="font-medium text-sm">{q}</p>
              <p className="text-muted-foreground text-sm mt-1">{a}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
