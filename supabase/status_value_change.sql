-- Ver el constraint actual (opcional, para referencia)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'orders_status_check';

-- Eliminar el constraint viejo y agregar uno nuevo con los nuevos estados
ALTER TABLE public.orders
  DROP CONSTRAINT orders_status_check;

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
