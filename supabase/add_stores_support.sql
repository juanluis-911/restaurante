-- ============================================================
-- Migración: Soporte para Tiendas (Abarrotes, Fruterías, etc.)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Tipo de negocio en restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'restaurant';

COMMENT ON COLUMN public.restaurants.business_type IS 'Tipo de negocio: restaurant | store';

-- 2. Campos nuevos en orders para el flujo de cotización
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_text text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rejection_message text;

COMMENT ON COLUMN public.orders.order_text IS 'Pedido libre de texto (solo tiendas)';
COMMENT ON COLUMN public.orders.rejection_message IS 'Mensaje del cliente al rechazar cotización';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS quote_message text;

COMMENT ON COLUMN public.orders.quote_message IS 'Mensaje del negocio al enviar cotización (sugerencias, cambios, notas)';

-- 4. Ampliar el check constraint de status para incluir nuevos estados
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'received',
      'preparing',
      'ready',
      'on_the_way',
      'delivered',
      'cancelled',
      'quoted',
      'quote_rejected',
      'accepted'
    )
  );
