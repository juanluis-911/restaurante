# Restaurant Ordering PWA — Especificación Completa del Proyecto

## Contexto general
Construir una Progressive Web App (PWA) completa para la gestión de restaurantes. La plataforma tiene dos caras:
- **Panel de administración** para el dueño del restaurante (gestión de menú, pedidos, cocina, reportes, POS)
- **Interfaz de cliente** donde los comensales pueden ver el menú y hacer pedidos desde cualquier dispositivo

---

## Stack tecnológico

- **Framework**: Next.js 15 con App Router (TypeScript estricto)
- **Base de datos + Auth + Realtime**: Supabase (PostgreSQL + Auth + Realtime subscriptions)
- **Estilos**: Tailwind CSS v4 + shadcn/ui como base de componentes
- **Hosting + Deploy**: Vercel
- **Analytics**: Vercel Analytics (@vercel/analytics) + Speed Insights (@vercel/speed-insights)
- **PWA**: next-pwa con service worker para offline básico y manifest.json
- **Pagos (opcional futuro)**: preparar integración con Stripe pero no implementar en v1
- **Imágenes**: Supabase Storage para fotos de productos

---

## Arquitectura de base de datos (Supabase)

### Tablas principales

**restaurants**
- id, owner_id (auth.users), name, slug (unique, para URL pública), logo_url, primary_color, secondary_color, font_choice, phone, address, timezone, delivery_enabled, delivery_radius_km, delivery_min_order, delivery_fee, created_at

**menus**
- id, restaurant_id, name, description, is_active, schedule (jsonb: [{day: 0-6, open: "HH:MM", close: "HH:MM"}]), created_at

**categories**
- id, menu_id, restaurant_id, name, description, position, is_active

**products**
- id, restaurant_id, category_id, name, description, price, image_url, is_active, is_featured, preparation_time_min, allergens (text[]), tags (text[]), created_at

**combos**
- id, restaurant_id, name, description, price, image_url, is_active, items (jsonb: [{product_id, quantity}]), created_at

**discounts**
- id, restaurant_id, name, type (percentage | fixed | combo_price), value, scope (all | category | product | combo), target_ids (uuid[]), starts_at, expires_at, is_active, max_uses, current_uses, created_at

**coupons**
- id, restaurant_id, code (unique per restaurant), discount_id, usage_type (single_use | per_user | until_date | unlimited), max_uses, used_count, expires_at, is_active, created_at

**coupon_uses**
- id, coupon_id, customer_identifier (email o session_id), used_at

**orders**
- id, restaurant_id, menu_id, source (online | pos), customer_name, customer_phone, customer_email, order_type (dine_in | pickup | delivery), delivery_address (jsonb), items (jsonb: [{product_id, combo_id, name, quantity, unit_price, modifiers}]), subtotal, discount_amount, coupon_code, total, status (received | accepted | preparing | ready | on_the_way | delivered | cancelled), notes, table_number, pos_session_id, created_at, updated_at

**kitchen_tickets**
- id, order_id, restaurant_id, items (jsonb), status (queued | cooking | done), priority, created_at, updated_at

**pos_sessions**
- id, restaurant_id, user_id, opened_at, closed_at, opening_cash, closing_cash, total_sales, status (open | closed)

**pos_transactions**
- id, pos_session_id, order_id, payment_method (cash | card | transfer), amount, change_amount, created_at

**restaurant_hours**
- id, restaurant_id, day_of_week (0-6), open_time, close_time, is_closed

---

## Módulos del panel de administración

### 1. Autenticación
- Login con email + password (Supabase Auth)
- Flujo de onboarding al primer login: crear restaurante, configurar nombre, logo, colores
- Middleware de Next.js que protege todas las rutas /dashboard/*
- Soporte para múltiples usuarios por restaurante en v2 (preparar la arquitectura con roles)

### 2. Dashboard principal (/dashboard)
- Resumen del día: pedidos totales, ingresos, pedidos pendientes, tiempo promedio
- Pedidos activos en tiempo real (tarjetas con estado visual)
- Gráfica simple de pedidos por hora del día
- Accesos rápidos: ir a cocina, abrir POS, ver pedidos

### 3. Gestión de menús (/dashboard/menus)
- Crear/editar/eliminar menús con nombre y descripción
- Cada menú tiene su propio horario semanal de disponibilidad
- Activar/desactivar menús con toggle
- Dentro de cada menú: gestión de categorías ordenables por drag & drop
- Dentro de cada categoría: gestión de productos

**Productos:**
- Nombre, descripción, precio, foto (upload a Supabase Storage)
- Toggle activo/inactivo
- Marcar como destacado
- Tiempo estimado de preparación
- Alérgenos (chips multi-select)
- Reordenar por drag & drop

**Combos:**
- Nombre, descripción, precio del combo (puede ser menor a suma de partes)
- Seleccionar 2+ productos que lo componen con sus cantidades
- Foto, toggle activo/inactivo

### 4. Descuentos y cupones (/dashboard/discounts)

**Descuentos automáticos:**
- Nombre, tipo (porcentaje, monto fijo)
- Alcance: todo el menú / categoría específica / producto individual / combo
- Fechas de inicio y fin
- Límite de usos (opcional)
- Activar/desactivar

**Cupones:**
- Código personalizable
- Asociar a un descuento existente
- Tipo de uso: un solo uso total | un uso por usuario/email | válido hasta fecha | ilimitado
- Ver historial de usos del cupón
- Generar código aleatorio

### 5. Configuración del restaurante (/dashboard/settings)

**Secciones:**
- **Información general**: nombre, slug (URL pública), teléfono, dirección, zona horaria
- **Apariencia**: color primario (color picker), color secundario, selección de tipografía (4-5 opciones), logo (upload)
- **Horarios**: horario de atención por día de la semana, días cerrados
- **Delivery**: activar/desactivar, tarifa de envío, pedido mínimo, radio de cobertura (km)
- **Notificaciones**: sonido al recibir pedido (toggle), número de WhatsApp para alertas (opcional)

### 6. Pedidos en tiempo real (/dashboard/orders)
- Vista Kanban con columnas: Recibido → Aceptado → En preparación → Listo → En camino → Entregado
- Cada tarjeta muestra: número de pedido, cliente, resumen de items, total, tiempo transcurrido, origen (online/POS), tipo (dine_in/pickup/delivery)
- Botones para mover al siguiente estado con un click
- Botón de cancelar con campo de motivo
- Al recibir pedido nuevo: sonido de notificación + badge en pestaña
- Suscripción Realtime de Supabase en la tabla orders
- Filtro por fecha, tipo de pedido, origen
- Vista detalle de pedido en modal/panel lateral

### 7. Pantalla de cocina (/dashboard/kitchen)
- Vista especial para pantalla táctil (fuente grande, alto contraste)
- Columnas: En cola → Cocinando → Listo
- Cada comanda muestra: número de orden, items con cantidades, notas especiales, tiempo en cola
- Los items se pueden marcar individualmente como listos
- Al marcar toda la comanda como lista, la orden pasa a estado "Listo" automáticamente
- Ordenar por tiempo de llegada (FIFO)
- Suscripción Realtime a kitchen_tickets
- URL directa /dashboard/kitchen pensada para abrirse en tablet/pantalla dedicada

### 8. POS — Punto de venta (/dashboard/pos)
- Abrir sesión de caja: registrar monto inicial en efectivo
- Selector de menú activo
- Cuadrícula de productos/combos con foto, nombre y precio
- Carrito lateral: agregar/quitar items, ver subtotal, aplicar descuento manual o cupón
- Seleccionar tipo de orden: comer aquí (mesa), para llevar, delivery
- Cobro:
  - Efectivo: calcular cambio automáticamente
  - Tarjeta: registrar monto (sin integración de terminal en v1)
  - Transferencia: registrar referencia
- Al confirmar cobro: crear order en BD + crear kitchen_ticket + imprimir o mostrar ticket en pantalla
- Cerrar sesión: resumen de ventas del turno, desglose por método de pago

### 9. Reportes de ventas (/dashboard/reports)
- Rango de fechas personalizable
- Métricas: ingresos totales, número de pedidos, ticket promedio, producto más vendido
- Gráfica de ventas por día/semana/mes (usar Recharts)
- Tabla de productos más vendidos con cantidad e ingresos
- Desglose por método de pago (solo POS en v1)
- Desglose por tipo de orden (dine_in / pickup / delivery)
- Uso de descuentos/cupones: cuántos pedidos usaron descuento, total descontado
- Exportar a CSV básico

---

## Interfaz pública del cliente

### URL: /{restaurant-slug}

**Página principal del restaurante:**
- Header con logo, nombre, horario actual, estado (abierto/cerrado)
- Si tiene múltiples menús activos: tabs para cambiar entre ellos
- Si hay un solo menú: mostrarlo directamente
- Categorías como navegación anclada (sticky sidebar en desktop, tabs horizontales en móvil)
- Productos en grid (foto, nombre, precio, badge de descuento si aplica)
- Al hacer click en producto: modal con foto grande, descripción, precio, botón "Agregar al carrito"
- Combos con badge especial y precio tachado si hay ahorro
- Carrito flotante (FAB en móvil) con badge de cantidad

**Flujo de checkout:**
1. Resumen del carrito con cantidades editables
2. Seleccionar tipo de orden (solo las opciones que el restaurante habilite)
3. Para delivery: ingresar dirección
4. Datos del cliente: nombre, teléfono (requeridos), email (opcional)
5. Aplicar cupón (campo + botón validar)
6. Resumen final con subtotal, descuentos, total
7. Botón "Confirmar pedido"
8. Página de confirmación con número de pedido y estado en tiempo real

**Seguimiento de pedido:**
- URL: /{restaurant-slug}/order/{order-id}
- Barra de progreso con los estados del pedido
- Actualización en tiempo real (Realtime subscription)
- Tiempo estimado de entrega/preparación

---

## Diseño y UX

- Aplicar la paleta de colores configurada por el restaurante usando CSS custom properties
- Diseño mobile-first responsive
- PWA: manifest.json completo, service worker para caché de assets estáticos, funciona en modo offline con mensaje apropiado
- Transiciones suaves entre estados (Framer Motion en admin, CSS transitions en cliente)
- Loading states con skeleton loaders (no spinners genéricos)
- Toast notifications para acciones del admin (shadcn/ui Sonner)
- Formularios con React Hook Form + Zod para validación

---

## Reglas de negocio importantes

1. Un restaurante puede tener múltiples menús pero solo los activos dentro de su horario son visibles para el cliente
2. Un descuento de mayor jerarquía no se acumula con otro del mismo alcance, se aplica el más favorable
3. Un cupón de "un solo uso" se invalida al primer uso exitoso en cualquier cliente
4. Un cupón "por usuario" valida por email; si el cliente no dio email, valida por session_id de localStorage
5. No se puede hacer pedido si el restaurante está cerrado (verificar contra horario configurado)
6. Los kitchen_tickets se crean automáticamente tanto para pedidos POS como para pedidos online
7. Al cancelar un pedido, el kitchen_ticket correspondiente también se cancela/archiva
8. El slug del restaurante debe ser único globalmente, sugerirlo a partir del nombre

---

## Estructura de carpetas sugerida (Next.js App Router)

```
/app
  /(public)
    /[slug]               → Menú público del restaurante
    /[slug]/order/[id]    → Seguimiento de pedido
  /(admin)
    /dashboard            → Home del admin
    /dashboard/menus      → Gestión de menús
    /dashboard/orders     → Pedidos en tiempo real
    /dashboard/kitchen    → Pantalla de cocina
    /dashboard/pos        → Punto de venta
    /dashboard/discounts  → Descuentos y cupones
    /dashboard/reports    → Reportes
    /dashboard/settings   → Configuración
  /auth
    /login
    /onboarding
/components
  /ui                     → shadcn/ui base
  /admin                  → componentes del panel
  /public                 → componentes del storefront
  /kitchen                → componentes de cocina
  /pos                    → componentes del POS
/lib
  /supabase               → cliente, tipos generados, helpers
  /hooks                  → useOrders, useKitchen, useCart, etc.
  /utils                  → cálculo de precios, descuentos, horarios
  /validations            → schemas Zod
/types                    → types TypeScript globales
```

---

## Puntos críticos de implementación

1. **Realtime**: Usar `supabase.channel()` con filtros por `restaurant_id` para no escuchar pedidos de otros restaurantes
2. **Multi-tenancy**: Todas las queries deben incluir `restaurant_id` en el WHERE. Configurar Row Level Security (RLS) en Supabase para que cada dueño solo vea sus datos
3. **Colores dinámicos**: Inyectar CSS variables en el layout del storefront desde la config del restaurante (`--color-primary`, `--color-secondary`)
4. **Horarios**: Toda la lógica de "está abierto" debe correr en el servidor con la timezone del restaurante, no la del cliente
5. **Performance**: Usar Next.js Image para todas las fotos de productos. El menú público debe ser ISR (revalidate cada 60s) + Realtime para el estado abierto/cerrado
6. **PWA en iOS**: El manifest debe incluir `apple-touch-icon` y meta tags específicos de iOS para la instalación

---

## Fases de desarrollo sugeridas

**Fase 1 — Core:**
Auth + onboarding + gestión de menú + storefront público + pedidos básicos + cocina

**Fase 2 — Operación:**
POS + descuentos y cupones + seguimiento de pedido en tiempo real

**Fase 3 — Analytics:**
Reportes de ventas + Vercel Analytics + optimización de performance

**Fase 4 — Escala:**
Multi-usuario con roles (admin, cajero, cocinero) + integración WhatsApp + Stripe payments