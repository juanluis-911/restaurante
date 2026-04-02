-- =====================================================
-- Trigger: incrementar order_count en billing_periods
-- al crear un nuevo pedido (source = 'online' o 'pos')
-- Ejecutar DESPUÉS de stripe_billing_schema.sql
-- =====================================================

CREATE OR REPLACE FUNCTION fn_increment_billing_order_count()
RETURNS TRIGGER AS $$
DECLARE
  v_week_start DATE;
  v_week_end   DATE;
BEGIN
  -- Calcular el lunes de la semana actual del pedido
  v_week_start := DATE_TRUNC('week', NEW.created_at AT TIME ZONE 'America/Mexico_City')::DATE;
  v_week_end   := v_week_start + INTERVAL '6 days';

  -- Upsert en billing_periods
  INSERT INTO billing_periods (restaurant_id, week_start, week_end, order_count, status)
  VALUES (NEW.restaurant_id, v_week_start, v_week_end, 1, 'open')
  ON CONFLICT (restaurant_id, week_start)
  DO UPDATE SET order_count = billing_periods.order_count + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger en la tabla orders
DROP TRIGGER IF EXISTS trg_billing_order_count ON orders;

CREATE TRIGGER trg_billing_order_count
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status != 'cancelled')
  EXECUTE FUNCTION fn_increment_billing_order_count();
