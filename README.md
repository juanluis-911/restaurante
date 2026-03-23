# RestaurantOS — Setup

## Requisitos previos
- Node.js 20+
- Proyecto en Supabase con el schema ejecutado
- Cuenta en Vercel (para deploy)

## Instalación

```bash
# 1. Instalar dependencias
npm install @supabase/supabase-js @supabase/ssr
npm install @vercel/analytics @vercel/speed-insights
npm install react-hook-form @hookform/resolvers zod
npm install sonner recharts
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install date-fns
npm install lucide-react

# 2. Instalar shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input label card dialog sheet badge toast tabs select switch skeleton avatar dropdown-menu form table

# 3. Copiar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus keys de Supabase

# 4. Generar tipos de TypeScript
mkdir src/types
supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.ts

# 5. Correr en desarrollo
npm run dev
```

## Estructura

```
src/
  app/
    (admin)/dashboard/     → Panel de administración
    (public)/[slug]/       → Storefront público del restaurante
    auth/                  → Login y onboarding
  components/
    admin/                 → Componentes del panel admin
    public/                → Componentes del storefront
    kitchen/               → Pantalla de cocina
    pos/                   → Terminal de punto de venta
  lib/
    supabase/              → Clientes browser y server
    utils/                 → Utilidades
  types/
    database.ts            → Tipos generados por Supabase CLI
```

## Módulos implementados

- [x] Auth (login, signup, logout)
- [x] Onboarding (crear restaurante)
- [x] Dashboard con stats y pedidos activos en tiempo real
- [x] Gestión de menús, categorías y productos
- [x] Descuentos automáticos y cupones con código
- [x] Pedidos en tiempo real (Kanban)
- [x] Pantalla de cocina (tickets en tiempo real)
- [x] POS — punto de venta con sesiones de caja
- [x] Configuración del restaurante (colores, horarios, delivery)
- [x] Reportes de ventas con gráficas (Recharts)
- [x] Storefront público para clientes
- [x] Seguimiento de pedido en tiempo real
- [x] PWA manifest
- [x] Vercel Analytics + Speed Insights

## Deploy en Vercel

1. Push a GitHub
2. Conectar repo en vercel.com
3. Agregar variables de entorno en Vercel Dashboard
4. Deploy automático en cada push a main
```
