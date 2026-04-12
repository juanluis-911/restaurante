# TuriEats — Especificación Completa del Proyecto

## Contexto general

Plataforma multi-negocio PWA para gestión de pedidos en línea y en punto de venta. Soporta dos tipos de negocio:

- **Restaurantes** — menú con precios fijos, flujo de pedido directo con pago por Stripe o efectivo
- **Tiendas** (abarrotes, fruterías, minisupers, etc.) — pedido libre de texto o por paquetes, el negocio cotiza el precio, el cliente acepta o negocia antes de pagar

Cada negocio tiene:
- **Panel de administración** — gestión de menú/paquetes, pedidos en tiempo real (kanban), cocina, POS, reportes, configuración
- **Storefront público** — `/[slug]` donde clientes hacen pedidos desde cualquier dispositivo

**Dominio de producción:** `turieats.com`

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.1 con App Router + Turbopack (TypeScript estricto) |
| Base de datos | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Realtime | Supabase Realtime (`postgres_changes`) |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Hosting | Vercel |
| Analytics | Vercel Analytics + Speed Insights |
| PWA | next-pwa (service worker + manifest.json) |
| Notificaciones push | Web Push API / VAPID (`web-push`) |
| Pagos | Stripe Connect (cada negocio tiene su propia cuenta Stripe) |
| Imágenes | Supabase Storage |

---

## Arquitectura de base de datos

### `restaurants`
```
id, owner_id (auth.users), name, slug (unique), logo_url, primary_color,
secondary_color, font_choice, phone, address, timezone,
delivery_enabled, delivery_radius_km, delivery_min_order, delivery_fee,
business_type (text: 'restaurant' | 'store'),  ← nuevo
stripe_account_id, stripe_charges_enabled,
created_at
```

### `menus`
```
id, restaurant_id, name, description, is_active,
schedule (jsonb: [{day: 0-6, open: "HH:MM", close: "HH:MM"}]),
created_at
```

### `categories`
```
id, menu_id, restaurant_id, name, description, position, is_active
```

### `products`
```
id, restaurant_id, category_id, name, description, price, image_url,
is_active, is_featured, preparation_time_min, allergens (text[]), tags (text[]),
created_at
```

### `combos`
Usados tanto en restaurantes como en tiendas (como "paquetes").
```
id, restaurant_id, name, description, price, image_url, is_active,
items (jsonb: [{product_id, quantity}]), created_at
```

### `orders`
```
id, restaurant_id, menu_id, source ('online' | 'pos'),
customer_name, customer_phone, customer_email,
order_type ('dine_in' | 'pickup' | 'delivery'),
delivery_address (jsonb: {street, neighborhood, city, references}),
items (jsonb: [{product_id?, combo_id?, name, quantity, unit_price}]),
subtotal, delivery_fee, discount_amount, coupon_code, total,
status (ver flujo abajo),
notes, order_text,          ← order_text: pedido libre de texto (tiendas)
table_number, pos_session_id,
stripe_session_id,          ← para identificar pago con tarjeta
driver_id,                  ← FK a drivers
quote_message,              ← mensaje del negocio al cotizar
rejection_message,          ← mensaje del cliente al negociar/rechazar cotización
created_at, updated_at
```

**Status constraint:**
```
received | preparing | ready | on_the_way | delivered | cancelled |
quoted | quote_rejected | accepted
```

### `kitchen_tickets`
```
id, order_id, restaurant_id, items (jsonb), status ('queued'|'cooking'|'done'),
priority, created_at, updated_at
```

### `drivers`
```
id, restaurant_id, user_id (auth.users), name, whatsapp,
vehicle_type ('moto' | 'carro' | 'bicicleta'), is_active
```

### `push_subscriptions`
```
id, type ('restaurant' | 'customer'), ref_id (restaurant_id o customer_identifier),
subscription (jsonb: Web Push subscription object), created_at
```

### `pos_sessions`
```
id, restaurant_id, user_id, opened_at, closed_at,
opening_cash, closing_cash, total_sales, status ('open' | 'closed')
```

### `pos_transactions`
```
id, pos_session_id, order_id,
payment_method ('cash' | 'card' | 'transfer'),
amount, change_amount, created_at
```

### `restaurant_hours`
```
id, restaurant_id, day_of_week (0-6), open_time, close_time, is_closed
```

### `discounts`
```
id, restaurant_id, name, type ('percentage' | 'fixed' | 'combo_price'),
value, scope ('all' | 'category' | 'product' | 'combo'),
target_ids (uuid[]), starts_at, expires_at, is_active,
max_uses, current_uses, created_at
```

### `coupons` / `coupon_uses`
```
coupons: id, restaurant_id, code, discount_id,
  usage_type ('single_use' | 'per_user' | 'until_date' | 'unlimited'),
  max_uses, used_count, expires_at, is_active

coupon_uses: id, coupon_id, customer_identifier, used_at
```

---

## Flujos de estado de orden

### Restaurantes
```
received → accepted → preparing → ready → on_the_way* → delivered
                                         → delivered (pickup/dine_in)
* solo si order_type = 'delivery'

En cualquier punto → cancelled
```

### Tiendas
```
received → quoted ──→ accepted → preparing → ready → on_the_way* → delivered
              ↑           │
        quote_rejected ←──┘  (cliente negocia, tienda re-cotiza)

En cualquier punto → cancelled
```

---

## Notificaciones push (Web Push / VAPID)

### Arquitectura
- Variables de entorno: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Suscripciones guardadas en tabla `push_subscriptions`
- Hook `usePushNotifications({ type, id })` — se usa tanto en dashboard como en OrderTracker

### Comportamiento de suscripción
- **Una sola vez**: si `Notification.permission === 'granted'` al montar el hook, se suscribe automáticamente (silencioso, sin prompt)
- Si el permiso es `'default'`, se muestra botón "Activar notificaciones"
- Si el permiso es `'denied'`, no se muestra nada

### Notificaciones que se envían (`notifyOrderStatusChanged`)
| Evento | Destino | Mensaje |
|--------|---------|---------|
| Nuevo pedido (restaurante) | Negocio | "🛵 Nuevo pedido — $X.XX / efectivo" |
| Nuevo pedido (tienda, total=0) | Negocio | "📦 Nuevo pedido — Por cotizar — #XXXXX" |
| `quoted` | Cliente | "💰 Tu pedido fue cotizado: $X.XX (envío $Y.YY). ¡Revísalo!" |
| `quote_rejected` | Negocio | "🤝 Cliente quiere negociar — [mensaje]" |
| `accepted` (efectivo) | Negocio | "💵 Cobrar $X.XX al cliente" |
| `accepted` (tarjeta) | Negocio | "💳 Pago de $X.XX recibido con tarjeta" |
| `preparing` | Cliente | "👨‍🍳 Tu pedido está en preparación" |
| `ready` | Cliente | "✅ Tu pedido está listo" |
| `on_the_way` | Cliente | "🛵 Tu pedido está en camino" |
| `delivered` | Cliente | "🎉 ¡Pedido entregado!" |
| `cancelled` | Cliente | "❌ Tu pedido fue cancelado" |

### Sonido en dashboard (negocio)
- Estilo UberEats: 2 pulsos `triangle` 190Hz + campana `sine` 1320Hz
- Se repite cada 10 segundos mientras haya pedidos en estado `received` sin atender
- Se detiene automáticamente cuando no hay pedidos `received`

---

## Storefront público — `/[slug]`

### Restaurantes
1. Header: logo, nombre, horario, badge abierto/cerrado
2. Menú por categorías (sticky sidebar desktop / tabs móvil)
3. Productos en grid con foto, nombre, precio, descuentos
4. Combos con badge especial
5. Carrito flotante (FAB móvil)
6. Checkout:
   - Tipo de orden (dine_in / pickup / delivery según config)
   - Dirección (si delivery)
   - Datos del cliente (nombre, teléfono requeridos; email opcional)
   - Cupón
   - Pago: Stripe Checkout (tarjeta) o efectivo
7. Redirección a tracking page

### Tiendas
1. Header igual al restaurante
2. Paquetes (combos) con precio fijo — opcional seleccionar
3. Textarea "¿Qué necesitas?" para pedido libre de texto
4. Checkout: mismos datos de cliente, SIN pago inmediato (total = 0, status = received)
5. Redirección a tracking page → el negocio cotizará el precio

---

## Tracking del cliente — `/[slug]/order/[id]`

Barra de progreso + estado en tiempo real (Realtime subscription). Botón "Activar notificaciones" si `permissionState === 'default'`.

### Estados especiales (tiendas)
**`quoted`** — el negocio envió una cotización:
- Muestra mensaje del negocio (`quote_message`) como burbuja azul 💬
- Muestra desglose: subtotal + envío + total
- Botones:
  - **Pagar con tarjeta** → Stripe Checkout con el precio ya fijado
  - **Pagar al recibir** → acepta sin pago inmediato
  - **Negociar** → modal con textarea para enviar propuesta al negocio

**`quote_rejected`** — "Negociando tu pedido... el negocio enviará una nueva cotización"

---

## Panel de administración

### `/dashboard/orders` — Kanban de pedidos

**Stats bar (3 tarjetas):**
- Activos ahora (pedidos en curso)
- Pedidos hoy (total del día)
- Ingresos hoy (solo `delivered`)

**Tabs:** "Órdenes activas" (con dot live verde) | "Historial"

**Columnas restaurante:**
`Recibidos → En cola → Cocinando → Listo → En camino`

**Columnas tienda:**
`Recibidos → Cotizados → Negociando → Aceptados → Preparando → Listo → En camino`

**Tarjeta de pedido:**
- `#XXXXX` + nombre cliente
- Badges: tipo de orden, origen (online/POS), 💳 Pagado (si stripe)
- Botón ícono `User` (esquina superior derecha) → **modal detalle cliente**
- Items del pedido / texto libre
- Notas
- Total
- Botón avanzar estado / estado informativo
- Botón cancelar (X)
- Highlight amarillo 3s para pedidos nuevos

**Modal detalle cliente (al hacer click en ícono User):**
- Nombre + ID del pedido
- Teléfono con botones "Llamar" (`tel:`) y "WhatsApp" (`wa.me/`)
- Email
- Dirección completa si `order_type === 'delivery'` (calle, colonia, ciudad, referencias)
- Lista de items / texto libre
- Notas
- Total

**Modal cotización (tiendas):**
- Precio del pedido ($) — requerido
- Costo de envío ($) — opcional
- Mensaje al cliente — opcional (se muestra como burbuja azul en tracking)
- Preview "Total a cobrar"
- Botón "Enviar cotización"

### `/dashboard/kitchen` — Pantalla de cocina
- Solo visible para `business_type === 'restaurant'` (oculto en sidebar para tiendas)
- Columnas: En cola → Cocinando → Listo
- Items marcables individualmente
- Realtime en `kitchen_tickets`

### `/dashboard/menus` — Gestión de menú
- Restaurantes: categorías + productos + combos
- Tiendas: solo combos (llamados "paquetes")
- Upload de fotos a Supabase Storage
- Toggle activo/inactivo, reordenar

### `/dashboard/pos` — Punto de venta
- Abrir/cerrar sesión de caja
- Cuadrícula de productos/combos
- Carrito con descuentos y cupones
- Tipos de cobro: efectivo (con cambio), tarjeta, transferencia
- Genera `order` + `kitchen_ticket` + `pos_transaction`

### `/dashboard/reports` — Reportes
- Métricas por rango de fechas
- Gráfica de ventas (Recharts)
- Top productos, desglose por método de pago y tipo de orden
- Exportar CSV

### `/dashboard/settings` — Configuración
- Info general: nombre, slug, teléfono, dirección, zona horaria
- Apariencia: color primario/secundario, tipografía, logo
- Horarios de atención por día
- Delivery: activar, tarifa, pedido mínimo, radio
- Stripe: conectar/desconectar cuenta, estado de verificación

---

## Onboarding (`/auth/onboarding`)

**Paso 0 — Tipo de negocio** ← nuevo
- Restaurante (menú con precios fijos)
- Tienda (cotización de precios)
- Guarda `business_type` en `restaurants`

**Paso 1 — Información básica**
- Nombre, slug (auto-sugerido desde nombre), zona horaria

**Paso 2 — Detalles adicionales**
- Teléfono, dirección (opcionales)

Al completar: crea restaurante + horarios predeterminados (L-S 9-22h, Dom cerrado)

---

## API routes

### Pedidos
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/orders/[id]/quote` | Negocio envía cotización (subtotal, delivery_fee, quote_message). Statuses válidos: received, quoted, quote_rejected |
| POST | `/api/orders/[id]/accept-quote` | Cliente acepta cotización en efectivo → status: accepted. No requiere auth (cliente anónimo). Notifica al negocio con isPaid: false |
| POST | `/api/orders/[id]/reject-quote` | Cliente negocia → status: quote_rejected, guarda rejection_message. Notifica al negocio |

### Stripe
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/stripe/checkout` | Crear sesión Stripe para pedido nuevo (restaurantes) |
| GET | `/api/stripe/checkout/success` | Webhook/callback post-pago. Si metadata tiene order_id → actualiza orden existente a accepted (isPaid: true). Si no → crea orden nueva |
| POST | `/api/stripe/store-quote-checkout` | Crear sesión Stripe para pago post-cotización (tiendas). Lee orden existente (status debe ser quoted) |
| GET/POST | `/api/stripe/connect/authorize` | Iniciar OAuth de Stripe Connect |
| GET/POST | `/api/stripe/connect/callback` | Callback de Stripe Connect, guarda stripe_account_id |
| POST | `/api/stripe/webhook` | Webhook de Stripe para eventos de pago |

### Push
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/push/subscribe` | Guardar suscripción push del cliente o negocio |

---

## Pagos con Stripe

### Restaurantes
1. Cliente confirma carrito → POST `/api/stripe/checkout` → redirige a Stripe Checkout
2. Stripe redirige a `/api/stripe/checkout/success?session_id=...`
3. Success route crea la orden con `status: 'received'` y `stripe_session_id`

### Tiendas — Pago post-cotización
1. Negocio envía cotización → `status: 'quoted'`, precio fijado
2. Cliente ve cotización en tracking page → elige "Pagar con tarjeta"
3. POST `/api/stripe/store-quote-checkout` → crea sesión Stripe con precio ya definido
4. Stripe redirige a success route → detecta `order_id` en metadata → actualiza orden existente a `accepted` (no crea nueva)

### Stripe Connect
- Cada negocio conecta su propia cuenta de Stripe
- La plataforma cobra comisión vía `application_fee_amount` en cada transacción
- Tarifas: $5 MXN por pedido online, $0.50 MXN por pedido POS, mínimo $100 MXN/semana

---

## Drivers (repartidores)

- Tabla `drivers` con nombre, whatsapp, tipo de vehículo
- Se asignan a pedidos `delivery` mediante `driver_id` en orders
- Reciben notificaciones push cuando se les asigna un pedido
- Panel de driver en `/driver` (dashboard separado para repartidores)

---

## Estructura de carpetas

```
/src
  /app
    /(public)
      /[slug]               → Storefront público
      /[slug]/order/[id]    → Tracking de pedido
    /(admin)
      /dashboard            → Home del admin
      /dashboard/orders     → Kanban de pedidos
      /dashboard/kitchen    → Pantalla de cocina (solo restaurantes)
      /dashboard/pos        → Punto de venta
      /dashboard/menus      → Gestión de menú/paquetes
      /dashboard/discounts  → Descuentos y cupones
      /dashboard/reports    → Reportes de ventas
      /dashboard/settings   → Configuración del negocio
    /api
      /orders/[id]/quote
      /orders/[id]/accept-quote
      /orders/[id]/reject-quote
      /stripe/checkout
      /stripe/checkout/success
      /stripe/store-quote-checkout
      /stripe/connect/authorize
      /stripe/connect/callback
      /stripe/webhook
      /push/subscribe
    /auth
      /login
      /register
      /onboarding
    /driver              → Dashboard de repartidores
    /cliente             → Historial de pedidos del cliente
  /components
    /ui                  → shadcn/ui base
    /admin               → OrdersKanban, CombosList, DashboardSidebar, etc.
    /public              → StorefrontClient, OrderTracker, etc.
    /kitchen             → KitchenDisplay
    /pos                 → POSInterface
    /driver              → DriverDashboard
  /lib
    /supabase            → createClient (server/client), tipos
    /hooks               → usePushNotifications, useCart, etc.
    /actions             → push-actions.ts (notificaciones server actions)
    /utils               → formatCurrency, helpers
  /types
    /database.ts         → tipos generados de Supabase
```

---

## Variables de entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://turieats.com

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PLATFORM_FEE_MXN=500   # en centavos

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:...
```

---

## Configuración de servicios externos al cambiar dominio

Al cambiar dominio a `turieats.com`:
1. **Vercel** — agregar dominio en Settings → Domains; actualizar `NEXT_PUBLIC_APP_URL`
2. **Supabase** — Authentication → URL Configuration: Site URL + Redirect URLs (`https://turieats.com/**`)
3. **Stripe** — actualizar endpoint del webhook a `https://turieats.com/api/stripe/webhook`
4. **VAPID** — no requiere cambio (ligado a claves, no al dominio)

---

## Reglas de negocio

1. Restaurante con múltiples menús: solo los activos en horario son visibles al cliente
2. Descuentos: se aplica el más favorable, no se acumulan del mismo alcance
3. Cupón `single_use`: se invalida al primer uso. `per_user`: valida por email o `session_id` de localStorage
4. Pedidos bloqueados si el negocio está cerrado (lógica en servidor con timezone del negocio)
5. `kitchen_tickets` se crean automáticamente al pasar a `accepted` (trigger DB). Para tiendas es inofensivo
6. Pedidos de tienda: siempre pasan por cotización aunque el cliente solo seleccione paquetes (precio puede variar por temporada/disponibilidad)
7. Re-cotización ilimitada: el cliente puede negociar `n` veces, la tienda re-cotiza sin límite
8. `accept-quote` no requiere autenticación del cliente (es anónimo) — usa service role key
9. Slug de negocio único globalmente; sugerido automáticamente desde el nombre

---

## Fases completadas

### Fase 1 — Core ✅
Auth + onboarding + gestión de menú + storefront restaurante + pedidos + cocina

### Fase 2 — Operación ✅
POS + descuentos y cupones + seguimiento en tiempo real + Stripe payments

### Fase 3 — Tiendas ✅
business_type + flujo de cotización + accept/reject-quote + store-quote-checkout + OrderTracker estados quoted/negociando + Kanban columnas tienda + modal cotización con mensaje

### Fase 4 — Notificaciones y UX ✅
Push notifications (VAPID) + suscripción única + sonido UberEats repetido + stats bar + live indicator + customer detail modal + terminología "Negociar"

### Fase 5 — Pendiente
- Multi-usuario con roles (admin, cajero, cocinero)
- Integración WhatsApp Business API
- App móvil nativa
