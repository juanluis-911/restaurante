-- ============================================================
-- SEED DATA — 5 Restaurantes de prueba
-- ============================================================
-- ANTES DE EJECUTAR:
--   1. Obtén tu user ID desde Supabase Dashboard → Authentication → Users
--      o ejecuta: SELECT id FROM auth.users LIMIT 1;
--   2. Reemplaza 'TU_USER_ID_AQUI' con ese UUID
-- ============================================================

DO $$
DECLARE
  v_owner_id    uuid := '05dfb0fb-a210-45c4-af76-3b87b674871b';

  -- Restaurant IDs
  r_taqueria    uuid := uuid_generate_v4();
  r_sushi       uuid := uuid_generate_v4();
  r_pizzeria    uuid := uuid_generate_v4();
  r_pollo       uuid := uuid_generate_v4();
  r_hotdog      uuid := uuid_generate_v4();

  -- Menu IDs
  m_taqueria    uuid := uuid_generate_v4();
  m_sushi       uuid := uuid_generate_v4();
  m_pizzeria    uuid := uuid_generate_v4();
  m_pollo       uuid := uuid_generate_v4();
  m_hotdog      uuid := uuid_generate_v4();

  -- Category IDs
  c_taqueria    uuid := uuid_generate_v4();
  c_sushi       uuid := uuid_generate_v4();
  c_pizzeria    uuid := uuid_generate_v4();
  c_pollo       uuid := uuid_generate_v4();
  c_hotdog      uuid := uuid_generate_v4();

BEGIN

  -- ============================================================
  -- 1. RESTAURANTES
  -- ============================================================
  INSERT INTO public.restaurants (
    id, owner_id, name, slug, phone, address, timezone,
    primary_color, secondary_color, font_choice,
    delivery_enabled, delivery_fee, delivery_min_order, delivery_radius_km,
    whatsapp_number, is_active
  ) VALUES
    (
      r_taqueria, v_owner_id, 'Taquería El Paisa', 'taqueria-el-paisa',
      '6621234567', 'Av. Reforma 100, Col. Centro, Hermosillo', 'America/Hermosillo',
      '#C0392B', '#2C3E50', 'inter',
      true, 30.00, 150.00, 5.0,
      '526621234567', true
    ),
    (
      r_sushi, v_owner_id, 'Sushi Sakura', 'sushi-sakura',
      '6627654321', 'Blvd. Kino 200, Col. Pitic, Hermosillo', 'America/Hermosillo',
      '#16A085', '#1A252F', 'inter',
      true, 45.00, 200.00, 6.0,
      '526627654321', true
    ),
    (
      r_pizzeria, v_owner_id, 'Pizza Bella', 'pizza-bella',
      '6629876543', 'Calle Sonora 350, Col. Villa, Hermosillo', 'America/Hermosillo',
      '#E74C3C', '#2C3E50', 'inter',
      true, 35.00, 180.00, 7.0,
      '526629876543', true
    ),
    (
      r_pollo, v_owner_id, 'Pollo Loco', 'pollo-loco',
      '6625551234', 'Av. Universidad 450, Col. Industrial, Hermosillo', 'America/Hermosillo',
      '#F39C12', '#1A252F', 'inter',
      true, 25.00, 120.00, 4.0,
      '526625551234', true
    ),
    (
      r_hotdog, v_owner_id, 'Hot Dog Bros', 'hot-dog-bros',
      '6623334455', 'Calle Guerrero 500, Col. Popular, Hermosillo', 'America/Hermosillo',
      '#E91E63', '#212121', 'inter',
      false, 0.00, 0.00, null,
      '526623334455', true
    );

  -- ============================================================
  -- 2. HORARIOS (Lun–Sáb 10am–10pm, Dom cerrado)
  -- ============================================================
  INSERT INTO public.restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
  SELECT
    r.id,
    g.day,
    CASE WHEN g.day = 0 THEN null ELSE '10:00'::time END,
    CASE WHEN g.day = 0 THEN null ELSE '22:00'::time END,
    (g.day = 0)
  FROM (
    VALUES (r_taqueria), (r_sushi), (r_pizzeria), (r_pollo), (r_hotdog)
  ) AS r(id)
  CROSS JOIN generate_series(0, 6) AS g(day);

  -- ============================================================
  -- 3. MENÚS
  -- ============================================================
  INSERT INTO public.menus (id, restaurant_id, name, description, is_active, position)
  VALUES
    (m_taqueria, r_taqueria, 'Menú Principal',  'Auténtica comida mexicana con ingredientes frescos', true, 0),
    (m_sushi,    r_sushi,    'Menú Sushi',       'Los mejores rolls, niguiris y sashimis de la ciudad', true, 0),
    (m_pizzeria, r_pizzeria, 'Menú Pizzas',      'Pizzas artesanales horneadas en piedra', true, 0),
    (m_pollo,    r_pollo,    'Menú Pollo',       'Pollo frito crujiente estilo sureño', true, 0),
    (m_hotdog,   r_hotdog,   'Menú Hot Dogs',    'Hot dogs estilo sonorense y americano', true, 0);

  -- ============================================================
  -- 4. CATEGORÍAS
  -- ============================================================
  INSERT INTO public.categories (id, menu_id, restaurant_id, name, position, is_active)
  VALUES
    (c_taqueria, m_taqueria, r_taqueria, 'Tacos',        0, true),
    (c_sushi,    m_sushi,    r_sushi,    'Rolls',         0, true),
    (c_pizzeria, m_pizzeria, r_pizzeria, 'Pizzas',        0, true),
    (c_pollo,    m_pollo,    r_pollo,    'Combos Pollo',  0, true),
    (c_hotdog,   m_hotdog,   r_hotdog,   'Hot Dogs',      0, true);

  -- ============================================================
  -- 5. PRODUCTOS
  -- ============================================================

  -- TAQUERÍA — 5 productos
  INSERT INTO public.products (
    restaurant_id, category_id, name, description,
    price, is_featured, preparation_time_min, tags, position, is_active
  ) VALUES
    (r_taqueria, c_taqueria, 'Taco de Carne Asada',
     'Tortilla de maíz, carne asada al carbón, cebolla, cilantro y salsa roja',
     25.00, true, 8, ARRAY['popular', 'sin gluten'], 0, true),

    (r_taqueria, c_taqueria, 'Taco al Pastor',
     'Adobada al pastor con piña, cebolla y cilantro',
     22.00, true, 8, ARRAY['popular'], 1, true),

    (r_taqueria, c_taqueria, 'Taco de Birria',
     'Birria de res estilo Jalisco con consomé para dipping',
     30.00, false, 10, ARRAY['especial'], 2, true),

    (r_taqueria, c_taqueria, 'Taco de Pollo',
     'Pollo a la plancha con pico de gallo, lechuga y crema',
     20.00, false, 7, ARRAY['light'], 3, true),

    (r_taqueria, c_taqueria, 'Orden de Quesadillas (3 pz)',
     'Quesadillas de maíz con queso Oaxaca, elige guisado',
     55.00, false, 12, ARRAY['vegetariano'], 4, true);


  -- SUSHI — 5 productos
  INSERT INTO public.products (
    restaurant_id, category_id, name, description,
    price, is_featured, preparation_time_min, tags, position, is_active
  ) VALUES
    (r_sushi, c_sushi, 'Roll California',
     '8 piezas con kanikama, aguacate, pepino y ajonjolí',
     120.00, true, 15, ARRAY['clásico'], 0, true),

    (r_sushi, c_sushi, 'Roll Spicy Tuna',
     '8 piezas con atún picante, pepino y sriracha',
     145.00, true, 15, ARRAY['picante', 'popular'], 1, true),

    (r_sushi, c_sushi, 'Roll Camarón Tempura',
     '8 piezas con camarón empanizado, aguacate y anguila',
     155.00, false, 18, ARRAY['popular'], 2, true),

    (r_sushi, c_sushi, 'Niguiri Mix (8 pz)',
     'Selección: salmón, atún, camarón y pulpo sobre arroz',
     180.00, false, 20, ARRAY['especial'], 3, true),

    (r_sushi, c_sushi, 'Sashimi de Salmón (12 pz)',
     '12 cortes frescos de salmón noruego de primera calidad',
     200.00, true, 10, ARRAY['premium', 'sin gluten'], 4, true);


  -- PIZZERÍA — 5 productos
  INSERT INTO public.products (
    restaurant_id, category_id, name, description,
    price, is_featured, preparation_time_min, tags, position, is_active
  ) VALUES
    (r_pizzeria, c_pizzeria, 'Pizza Margherita',
     'Salsa de tomate San Marzano, mozzarella fresca y albahaca',
     140.00, false, 20, ARRAY['vegetariano', 'clásico'], 0, true),

    (r_pizzeria, c_pizzeria, 'Pizza Pepperoni',
     'Salsa de tomate, mozzarella y doble pepperoni',
     165.00, true, 20, ARRAY['popular'], 1, true),

    (r_pizzeria, c_pizzeria, 'Pizza BBQ Pollo',
     'Salsa BBQ, pollo ahumado, cebolla morada y mozzarella',
     175.00, true, 22, ARRAY['popular'], 2, true),

    (r_pizzeria, c_pizzeria, 'Pizza Cuatro Quesos',
     'Mozzarella, gouda, parmesano y gorgonzola sobre base blanca',
     180.00, false, 22, ARRAY['vegetariano', 'premium'], 3, true),

    (r_pizzeria, c_pizzeria, 'Pizza Hawaiana',
     'Salsa de tomate, jamón de pierna, piña natural y mozzarella',
     160.00, false, 20, ARRAY['clásico'], 4, true);


  -- POLLO FRITO — 5 productos
  INSERT INTO public.products (
    restaurant_id, category_id, name, description,
    price, is_featured, preparation_time_min, tags, position, is_active
  ) VALUES
    (r_pollo, c_pollo, 'Combo 2 Piezas',
     '2 piezas de pollo frito crujiente con papas medianas y refresco',
     99.00, true, 15, ARRAY['popular'], 0, true),

    (r_pollo, c_pollo, 'Combo Familiar 4 Piezas',
     '4 piezas de pollo frito, papas grandes y 2 refrescos',
     185.00, true, 18, ARRAY['familiar', 'popular'], 1, true),

    (r_pollo, c_pollo, 'Alitas BBQ (10 pz)',
     '10 alitas glaseadas en BBQ con dip ranch y papas',
     145.00, false, 20, ARRAY['popular'], 2, true),

    (r_pollo, c_pollo, 'Pechuga a la Plancha',
     'Pechuga entera a la plancha con ensalada cesar y arroz',
     110.00, false, 12, ARRAY['light', 'saludable'], 3, true),

    (r_pollo, c_pollo, 'Nuggets (12 pz)',
     '12 nuggets crujientes de pechuga con salsa a elegir',
     80.00, false, 10, ARRAY['kids'], 4, true);


  -- HOT DOGS — 5 productos
  INSERT INTO public.products (
    restaurant_id, category_id, name, description,
    price, is_featured, preparation_time_min, tags, position, is_active
  ) VALUES
    (r_hotdog, c_hotdog, 'Hot Dog Sonorense',
     'Salchicha de res envuelta en tocino, frijoles, tomate, mayonesa y mostaza',
     60.00, true, 8, ARRAY['popular', 'clásico'], 0, true),

    (r_hotdog, c_hotdog, 'Hot Dog Americano',
     'Salchicha jumbo con mostaza amarilla, cátsup y relish de pepinillo',
     55.00, false, 7, ARRAY['clásico'], 1, true),

    (r_hotdog, c_hotdog, 'Cheese Dog',
     'Salchicha con queso cheddar derretido, tocino crujiente y cebolla',
     70.00, true, 8, ARRAY['popular'], 2, true),

    (r_hotdog, c_hotdog, 'Hot Dog BBQ',
     'Salchicha con salsa BBQ ahumada, cebolla crujiente y jalapeños',
     65.00, false, 8, ARRAY['picante'], 3, true),

    (r_hotdog, c_hotdog, 'Combo Hot Dog + Papas',
     'Hot dog sonorense más orden de papas a la francesa con aderezo',
     85.00, false, 10, ARRAY['combo'], 4, true);


  RAISE NOTICE 'Seed completado: 5 restaurantes, 5 menús, 5 categorías, 25 productos.';

END $$;
