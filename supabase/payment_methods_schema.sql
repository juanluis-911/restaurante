-- Métodos de pago configurables por restaurante
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS cash_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS card_enabled boolean NOT NULL DEFAULT true;
