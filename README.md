# RestaurantOS

PWA completa para gestión de restaurantes. Tiene dos caras: un **panel de administración** para el dueño (menú, pedidos, cocina, POS, reportes) y una **interfaz pública** donde los clientes ven el menú y hacen pedidos desde cualquier dispositivo.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 — App Router, TypeScript estricto |
| Base de datos / Auth / Realtime | Supabase (PostgreSQL + Auth + Realtime) |
| Estilos | Tailwind CSS v4 + shadcn/ui |
| Formularios | React Hook Form + Zod |
| Gráficas | Recharts |
| Drag & drop | @dnd-kit |
| Hosting / Deploy | Vercel |
| Analytics | Vercel Analytics + Speed Insights |
| PWA | next-pwa (service worker + manifest) |

---

## Módulos del panel de administración

### Autenticación (`/auth`)
- Login con email + password (Supabase Auth)
- Onboarding al primer login: crear restaurante, configurar nombre, logo y colores
- Middleware de Next.js protege todas las rutas `/dashboard/*`

### Dashboard (`/dashboard`)
- Resumen del día: pedidos totales, ingresos, pedidos pendientes, tiempo promedio
- Pedidos activos en tiempo real con estado visual
- Gráfica de pedidos por hora del día
- Accesos rápidos a cocina, POS y pedidos

### Gestión de menús (`/dashboard/menus`)
- Crear / editar / eliminar menús con nombre, descripción y horario semanal de disponibilidad
- Activar / desactivar menús con toggle
- **Categorías** ordenables por drag & drop dentro de cada menú
- **Productos** por categoría: nombre, descripción, precio, foto (Supabase Storage), toggle activo/inactivo, destacado, tiempo de preparación, alérgenos (multi-select), reordenables por drag & drop
- **Combos**: agrupar 2+ productos con precio propio, foto, toggle activo/inactivo

### Descuentos y cupones (`/dashboard/discounts`)
- **Descuentos automáticos**: porcentaje o monto fijo, alcance configurable (todo el menú / categoría / producto / combo), fechas de vigencia, límite de usos opcional
- **Cupones**: código personalizable o generado aleatoriamente, asociados a un descuento, tipos de uso — único total / por usuario o email / hasta fecha / ilimitado, historial de usos

### Pedidos en tiempo real (`/dashboard/orders`)
- Vista **Kanban**: Recibido → Aceptado → En preparación → Listo → En camino → Entregado
- Cada tarjeta muestra número de pedido, cliente, items, total, tiempo transcurrido, origen (online/POS) y tipo (dine-in/pickup/delivery)
- Avanzar de estado con un click; cancelar con campo de motivo
- Sonido de notificación + badge en pestaña al recibir pedido nuevo
- Suscripción Realtime a la tabla `orders` filtrada por `restaurant_id`
- Filtros por fecha, tipo de pedido y origen
- Vista detalle en modal / panel lateral

### Pantalla de cocina (`/dashboard/kitchen`)
- UI especial para tablet/pantalla táctil: fuente grande, alto contraste
- Columnas: En cola → Cocinando → Listo
- Cada comanda muestra número de orden, items con cantidades, notas y tiempo en cola (FIFO)
- Marcar items individualmente como listos; al completar todos, la orden pasa a "Listo" automáticamente
- Suscripción Realtime a `kitchen_tickets`

### Punto de venta — POS (`/dashboard/pos`)
- Abrir sesión de caja registrando efectivo inicial
- Selector de menú activo
- Cuadrícula de productos y combos con foto, nombre y precio
- Carrito lateral: agregar/quitar items, subtotal, aplicar descuento manual o cupón
- Tipos de orden: comer aquí (mesa), para llevar, delivery
- Métodos de cobro: efectivo (calcula cambio), tarjeta, transferencia
- Al confirmar: crea `order` + `kitchen_ticket` + muestra ticket en pantalla
- Cerrar sesión: resumen de ventas del turno desglosado por método de pago

### Reportes de ventas (`/dashboard/reports`)
- Rango de fechas personalizable
- Métricas: ingresos totales, número de pedidos, ticket promedio, producto más vendido
- Gráfica de ventas por día/semana/mes (Recharts)
- Tabla de productos más vendidos con cantidad e ingresos
- Desglose por método de pago y por tipo de orden
- Estadísticas de uso de descuentos y cupones
- Exportar a CSV

### Configuración del restaurante (`/dashboard/settings`)
- **General**: nombre, slug (URL pública), teléfono, dirección, zona horaria
- **Apariencia**: color primario y secundario (color picker), tipografía (varias opciones), logo
- **Horarios**: atención por día de la semana, marcar días cerrados
- **Delivery**: activar/desactivar, tarifa, pedido mínimo, radio de cobertura (km)
- **Notificaciones**: sonido al recibir pedido, número de WhatsApp para alertas

---

## Interfaz pública del cliente

### Storefront (`/{restaurant-slug}`)
- Header con logo, nombre, horario y estado abierto/cerrado
- Tabs para múltiples menús activos; menú único se muestra directamente
- Categorías como navegación anclada (sidebar en desktop, tabs horizontales en móvil)
- Grid de productos con foto, nombre, precio y badge de descuento
- Modal de producto con foto grande, descripción y botón "Agregar al carrito"
- Combos con badge especial y precio tachado si hay ahorro
- Carrito flotante (FAB en móvil) con badge de cantidad
- Colores y tipografía del restaurante aplicados vía CSS custom properties

### Checkout
1. Resumen del carrito con cantidades editables
2. Seleccionar tipo de orden (según lo que habilite el restaurante)
3. Dirección de entrega (si es delivery)
4. Datos del cliente: nombre, teléfono (requeridos), email (opcional)
5. Aplicar cupón con validación en tiempo real
6. Resumen final: subtotal, descuentos, total
7. Confirmación con número de pedido

### Seguimiento de pedido (`/{restaurant-slug}/order/{order-id}`)
- Barra de progreso con los estados del pedido
- Actualización en tiempo real (Realtime subscription)
- Tiempo estimado de entrega/preparación

---

## Base de datos (Supabase)

| Tabla | Descripción |
|-------|-------------|
| `restaurants` | Configuración del restaurante (slug, colores, horarios, delivery) |
| `menus` | Menús con horario semanal de disponibilidad |
| `categories` | Categorías dentro de cada menú |
| `products` | Productos con precio, foto, alérgenos y tags |
| `combos` | Combos de productos con precio propio |
| `discounts` | Descuentos automáticos (porcentaje / fijo) |
| `coupons` | Códigos de cupón con reglas de uso |
| `coupon_uses` | Historial de usos de cupones |
| `orders` | Pedidos (online y POS) con estado y detalle en JSONB |
| `kitchen_tickets` | Comandas para la pantalla de cocina |
| `pos_sessions` | Sesiones de caja (apertura / cierre) |
| `pos_transactions` | Transacciones por sesión con método de pago |
| `restaurant_hours` | Horario de atención por día de la semana |

Row Level Security activo en todas las tablas: cada dueño solo ve sus propios datos.

---

## Estructura del proyecto

```
src/
  app/
    (admin)/dashboard/     → Panel de administración
      page.tsx             → Dashboard home
      menus/               → Gestión de menús, categorías y productos
      orders/              → Kanban de pedidos en tiempo real
      kitchen/             → Pantalla de cocina
      pos/                 → Punto de venta
      discounts/           → Descuentos y cupones
      reports/             → Reportes de ventas
      settings/            → Configuración del restaurante
    (public)/[slug]/       → Storefront público
      order/[id]/          → Seguimiento de pedido
    auth/                  → Login y onboarding
    actions/               → Server Actions
  components/
    admin/                 → Componentes del panel admin
    public/                → Componentes del storefront
    kitchen/               → Pantalla de cocina
    pos/                   → Terminal POS
    driver/                → Módulo de conductor (delivery)
  lib/
    supabase/              → Clientes browser y server
    utils/                 → Utilidades y helpers
  types/
    database.ts            → Tipos generados por Supabase CLI
```

---

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus keys de Supabase

# 3. Generar tipos TypeScript desde Supabase
supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.ts

# 4. Correr en desarrollo
npm run dev
```

**Variables de entorno requeridas:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Deploy en Vercel

1. Push a GitHub
2. Conectar repositorio en vercel.com
3. Agregar variables de entorno en el Vercel Dashboard
4. Deploy automático en cada push a `main`

---

## Roadmap

- [x] Auth + onboarding
- [x] Gestión de menús, categorías, productos y combos
- [x] Descuentos automáticos y cupones
- [x] Pedidos en tiempo real (Kanban)
- [x] Pantalla de cocina
- [x] POS con sesiones de caja
- [x] Configuración del restaurante
- [x] Reportes de ventas con gráficas
- [x] Storefront público con checkout
- [x] Seguimiento de pedido en tiempo real
- [x] PWA (manifest + service worker)
- [x] Vercel Analytics + Speed Insights
- [ ] Multi-usuario con roles (admin, cajero, cocinero)
- [ ] Notificaciones por WhatsApp
- [ ] Pagos con Stripe
