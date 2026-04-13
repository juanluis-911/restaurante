-- Repartidores propios del restaurante (sin necesidad de cuenta de usuario)
CREATE TABLE IF NOT EXISTS restaurant_own_drivers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  whatsapp      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Campos para asignar repartidor propio directamente en la orden
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS own_driver_name     TEXT,
  ADD COLUMN IF NOT EXISTS own_driver_whatsapp TEXT;
