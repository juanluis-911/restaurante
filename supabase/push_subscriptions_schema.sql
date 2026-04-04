-- ============================================================
-- PUSH SUBSCRIPTIONS SCHEMA
-- Web Push notification subscriptions por actor (restaurante, driver, cliente)
-- ============================================================

CREATE TABLE public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint      text UNIQUE NOT NULL,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  -- Quién recibe las notificaciones (exactamente uno de los tres debe estar seteado)
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  driver_id     uuid REFERENCES public.drivers(id)     ON DELETE CASCADE,
  order_id      uuid REFERENCES public.orders(id)      ON DELETE CASCADE,
  -- Usuario autenticado (opcional, para cleanup si el usuario borra su cuenta)
  user_id       uuid REFERENCES auth.users(id)         ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subs_restaurant ON public.push_subscriptions(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX idx_push_subs_driver     ON public.push_subscriptions(driver_id)     WHERE driver_id     IS NOT NULL;
CREATE INDEX idx_push_subs_order      ON public.push_subscriptions(order_id)      WHERE order_id      IS NOT NULL;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar su propia suscripción (clientes anónimos incluidos)
CREATE POLICY "push_subs_insert" ON public.push_subscriptions
  FOR INSERT WITH CHECK (true);

-- Solo el backend con service_role puede leer y borrar (para envío y cleanup)
-- Los clientes nunca necesitan leer subscripciones ajenas
CREATE POLICY "push_subs_select_service" ON public.push_subscriptions
  FOR SELECT USING (true);

CREATE POLICY "push_subs_delete_service" ON public.push_subscriptions
  FOR DELETE USING (true);
