-- ============================================================
-- Seed: Paquetes de la Frutería
-- Restaurant ID: ee71bf0b-c539-419c-b3a7-03ff749ea8b6
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

INSERT INTO public.combos (restaurant_id, name, description, price, items, is_active, position)
VALUES
  (
    'ee71bf0b-c539-419c-b3a7-03ff749ea8b6',
    'Todo para tu ceviche',
    'Trae todo lo que necesitas: tomate, cebolla, pepino, chile serrano, limones y cilantro.',
    95.00,
    '[{"name":"Tomate (1 kg)","quantity":1},{"name":"Cebolla (1 pieza)","quantity":1},{"name":"Pepino (2 piezas)","quantity":2},{"name":"Chile serrano (100 g)","quantity":1},{"name":"Limones (1 kg)","quantity":1},{"name":"Cilantro (1 manojo)","quantity":1}]',
    true,
    1
  ),
  (
    'ee71bf0b-c539-419c-b3a7-03ff749ea8b6',
    'Todo para tu carne asada',
    'Lo esencial para tu carne: cebolla cambray, chiles, aguacates, limones y tortillas de harina.',
    120.00,
    '[{"name":"Cebolla cambray (1 manojo)","quantity":1},{"name":"Chile jalapeño (200 g)","quantity":1},{"name":"Aguacate (3 piezas)","quantity":3},{"name":"Limones (1 kg)","quantity":1},{"name":"Tortillas de harina (1 paquete)","quantity":1}]',
    true,
    2
  ),
  (
    'ee71bf0b-c539-419c-b3a7-03ff749ea8b6',
    'Todo para tu pozole',
    'Chile ancho, chile guajillo, cabeza de ajo, cebolla, orégano y limones para tu pozole.',
    85.00,
    '[{"name":"Chile ancho (100 g)","quantity":1},{"name":"Chile guajillo (100 g)","quantity":1},{"name":"Cabeza de ajo","quantity":1},{"name":"Cebolla (2 piezas)","quantity":2},{"name":"Limones (500 g)","quantity":1},{"name":"Orégano (1 bolsita)","quantity":1}]',
    true,
    3
  ),
  (
    'ee71bf0b-c539-419c-b3a7-03ff749ea8b6',
    'Despensa básica semanal',
    'Papa, zanahoria, calabaza, tomate, cebolla y ajo. Lo básico para cocinar toda la semana.',
    110.00,
    '[{"name":"Papa (2 kg)","quantity":1},{"name":"Zanahoria (1 kg)","quantity":1},{"name":"Calabaza (1 kg)","quantity":1},{"name":"Tomate (1 kg)","quantity":1},{"name":"Cebolla (3 piezas)","quantity":3},{"name":"Ajo (1 cabeza)","quantity":1}]',
    true,
    4
  ),
  (
    'ee71bf0b-c539-419c-b3a7-03ff749ea8b6',
    'Canasta de frutas',
    'Plátano, manzana, naranja, mandarina y uva. Fruta fresca variada para toda la familia.',
    130.00,
    '[{"name":"Plátano (1 kg)","quantity":1},{"name":"Manzana (1 kg)","quantity":1},{"name":"Naranja (1 kg)","quantity":1},{"name":"Mandarina (1 kg)","quantity":1},{"name":"Uva (500 g)","quantity":1}]',
    true,
    5
  );
