-- =====================================================
-- Stripe Billing Schema
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columnas de Stripe a la tabla restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS stripe_account_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_status    TEXT NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS billing_status           TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT;

-- 'stripe_account_status': 'not_connected' | 'pending' | 'active'
-- 'billing_status':        'active' | 'suspended'

-- 2. Tabla de periodos de facturación semanales
CREATE TABLE IF NOT EXISTS billing_periods (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  week_start          DATE        NOT NULL,  -- Lunes
  week_end            DATE        NOT NULL,  -- Domingo
  order_count         INTEGER     NOT NULL DEFAULT 0,
  amount_owed         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status              TEXT        NOT NULL DEFAULT 'open',
  -- 'open'     → semana en curso (acumulando pedidos)
  -- 'invoiced' → factura creada en Stripe, esperando pago
  -- 'paid'     → pago confirmado por webhook
  -- 'overdue'  → vencida, restaurante suspendido
  stripe_invoice_id   TEXT,
  stripe_payment_url  TEXT,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(restaurant_id, week_start)
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_billing_periods_restaurant_id ON billing_periods(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_billing_periods_status        ON billing_periods(status);
CREATE INDEX IF NOT EXISTS idx_billing_periods_week_start    ON billing_periods(week_start);

-- 3. RLS: solo el dueño del restaurante puede ver sus periodos
ALTER TABLE billing_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_billing_periods"
  ON billing_periods FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- El service_role (backend) puede hacer todo sin restricciones de RLS
-- (el service_role bypasea RLS por defecto en Supabase)
