-- Agregar contador separado para pedidos POS
ALTER TABLE billing_periods
  ADD COLUMN IF NOT EXISTS pos_order_count INTEGER NOT NULL DEFAULT 0;

-- Reemplazar la función del trigger para separar online vs POS
CREATE OR REPLACE FUNCTION fn_increment_billing_order_count()
RETURNS TRIGGER AS $$
DECLARE
  v_week_start DATE;
  v_week_end   DATE;
BEGIN
  v_week_start := DATE_TRUNC('week', NEW.created_at AT TIME ZONE 'America/Mexico_City')::DATE;
  v_week_end   := v_week_start + INTERVAL '6 days';

  IF NEW.source = 'pos' THEN
    INSERT INTO billing_periods (restaurant_id, week_start, week_end, order_count, pos_order_count, status)
    VALUES (NEW.restaurant_id, v_week_start, v_week_end, 0, 1, 'open')
    ON CONFLICT (restaurant_id, week_start)
    DO UPDATE SET pos_order_count = billing_periods.pos_order_count + 1;
  ELSE
    -- 'online' u otro source
    INSERT INTO billing_periods (restaurant_id, week_start, week_end, order_count, pos_order_count, status)
    VALUES (NEW.restaurant_id, v_week_start, v_week_end, 1, 0, 'open')
    ON CONFLICT (restaurant_id, week_start)
    DO UPDATE SET order_count = billing_periods.order_count + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
