-- ============================================================
-- RESTAURANT PWA — Supabase Schema Completo
-- Ejecutar en el SQL Editor de Supabase en orden
-- ============================================================

-- ============================================================
-- 0. EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- para búsqueda de texto


-- ============================================================
-- 1. TABLA: restaurants
-- ============================================================
create table public.restaurants (
  id                  uuid primary key default uuid_generate_v4(),
  owner_id            uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  slug                text not null unique,
  logo_url            text,
  phone               text,
  address             text,
  timezone            text not null default 'America/Hermosillo',
  -- Apariencia
  primary_color       text not null default '#E53E3E',
  secondary_color     text not null default '#1A202C',
  font_choice         text not null default 'inter',
  -- Delivery
  delivery_enabled    boolean not null default false,
  delivery_fee        numeric(10,2) not null default 0,
  delivery_min_order  numeric(10,2) not null default 0,
  delivery_radius_km  numeric(5,1),
  -- WhatsApp para notificaciones (opcional)
  whatsapp_number     text,
  notification_sound  boolean not null default true,
  -- Metadatos
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.restaurants is 'Un owner puede tener múltiples restaurantes en el futuro';

-- Índices
create index idx_restaurants_owner  on public.restaurants(owner_id);
create index idx_restaurants_slug   on public.restaurants(slug);


-- ============================================================
-- 2. TABLA: restaurant_hours
-- Horario de atención por día de la semana
-- ============================================================
create table public.restaurant_hours (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  day_of_week     smallint not null check (day_of_week between 0 and 6), -- 0=Dom, 1=Lun...
  open_time       time,   -- null si is_closed=true
  close_time      time,
  is_closed       boolean not null default false,
  unique (restaurant_id, day_of_week)
);

create index idx_restaurant_hours_restaurant on public.restaurant_hours(restaurant_id);


-- ============================================================
-- 3. TABLA: menus
-- Un restaurante puede tener varios menús (taquería, hamburguesería, etc.)
-- ============================================================
create table public.menus (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  description     text,
  is_active       boolean not null default true,
  -- Horario de disponibilidad: array de objetos {day: 0-6, open: "HH:MM", close: "HH:MM"}
  schedule        jsonb not null default '[]',
  position        smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_menus_restaurant on public.menus(restaurant_id);


-- ============================================================
-- 4. TABLA: categories
-- Categorías dentro de un menú (Tacos, Bebidas, Postres, etc.)
-- ============================================================
create table public.categories (
  id              uuid primary key default uuid_generate_v4(),
  menu_id         uuid not null references public.menus(id) on delete cascade,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  description     text,
  image_url       text,
  position        smallint not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_categories_menu        on public.categories(menu_id);
create index idx_categories_restaurant  on public.categories(restaurant_id);


-- ============================================================
-- 5. TABLA: products
-- ============================================================
create table public.products (
  id                      uuid primary key default uuid_generate_v4(),
  restaurant_id           uuid not null references public.restaurants(id) on delete cascade,
  category_id             uuid references public.categories(id) on delete set null,
  name                    text not null,
  description             text,
  price                   numeric(10,2) not null check (price >= 0),
  image_url               text,
  is_active               boolean not null default true,
  is_featured             boolean not null default false,
  preparation_time_min    smallint,                 -- minutos estimados
  allergens               text[] not null default '{}',
  tags                    text[] not null default '{}',
  position                smallint not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_products_restaurant  on public.products(restaurant_id);
create index idx_products_category    on public.products(category_id);
create index idx_products_active      on public.products(restaurant_id, is_active);


-- ============================================================
-- 6. TABLA: combos
-- ============================================================
create table public.combos (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  description     text,
  price           numeric(10,2) not null check (price >= 0),
  image_url       text,
  is_active       boolean not null default true,
  -- [{product_id: uuid, quantity: int, name: text}]
  items           jsonb not null default '[]',
  position        smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_combos_restaurant on public.combos(restaurant_id);


-- ============================================================
-- 7. TABLA: discounts
-- Descuentos automáticos (se aplican sin código)
-- ============================================================
create table public.discounts (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  description     text,
  -- Tipo de descuento
  type            text not null check (type in ('percentage', 'fixed', 'combo_price')),
  value           numeric(10,2) not null check (value >= 0),
  -- Alcance del descuento
  scope           text not null check (scope in ('all', 'category', 'product', 'combo')),
  target_ids      uuid[] not null default '{}', -- IDs de categorías/productos/combos afectados
  -- Vigencia
  starts_at       timestamptz,
  expires_at      timestamptz,
  -- Límites
  max_uses        integer,            -- null = ilimitado
  current_uses    integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_discounts_restaurant on public.discounts(restaurant_id);
create index idx_discounts_active     on public.discounts(restaurant_id, is_active, expires_at);


-- ============================================================
-- 8. TABLA: coupons
-- Cupones con código que el cliente ingresa manualmente
-- ============================================================
create table public.coupons (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  code            text not null,
  discount_id     uuid not null references public.discounts(id) on delete cascade,
  -- Tipo de uso
  usage_type      text not null check (usage_type in ('single_use', 'per_user', 'until_date', 'unlimited')),
  max_uses        integer,
  used_count      integer not null default 0,
  expires_at      timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  -- El código debe ser único por restaurante
  unique (restaurant_id, code)
);

create index idx_coupons_restaurant on public.coupons(restaurant_id);
create index idx_coupons_code       on public.coupons(restaurant_id, code);


-- ============================================================
-- 9. TABLA: coupon_uses
-- Registro de cada uso de un cupón
-- ============================================================
create table public.coupon_uses (
  id                    uuid primary key default uuid_generate_v4(),
  coupon_id             uuid not null references public.coupons(id) on delete cascade,
  order_id              uuid, -- se actualiza después de crear la orden
  customer_identifier   text not null, -- email del cliente o session_id anónimo
  used_at               timestamptz not null default now()
);

create index idx_coupon_uses_coupon   on public.coupon_uses(coupon_id);
create index idx_coupon_uses_customer on public.coupon_uses(coupon_id, customer_identifier);


-- ============================================================
-- 10. TABLA: pos_sessions
-- Sesiones de caja del POS
-- ============================================================
create table public.pos_sessions (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  user_id         uuid not null references auth.users(id),
  status          text not null default 'open' check (status in ('open', 'closed')),
  opening_cash    numeric(10,2) not null default 0,
  closing_cash    numeric(10,2),
  total_sales     numeric(10,2) not null default 0,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz
);

create index idx_pos_sessions_restaurant on public.pos_sessions(restaurant_id);
create index idx_pos_sessions_open       on public.pos_sessions(restaurant_id, status);


-- ============================================================
-- 11. TABLA: orders
-- Pedidos (tanto online como POS)
-- ============================================================
create table public.orders (
  id                  uuid primary key default uuid_generate_v4(),
  restaurant_id       uuid not null references public.restaurants(id) on delete cascade,
  menu_id             uuid references public.menus(id) on delete set null,
  -- Origen del pedido
  source              text not null default 'online' check (source in ('online', 'pos')),
  order_type          text not null check (order_type in ('dine_in', 'pickup', 'delivery')),
  -- Datos del cliente
  customer_name       text not null,
  customer_phone      text,
  customer_email      text,
  -- Entrega (solo si order_type = 'delivery')
  delivery_address    jsonb,  -- {street, neighborhood, city, references, lat, lng}
  -- Items del pedido
  -- [{product_id?, combo_id?, name, quantity, unit_price, discount_amount, subtotal, notes}]
  items               jsonb not null default '[]',
  -- Totales
  subtotal            numeric(10,2) not null default 0,
  discount_amount     numeric(10,2) not null default 0,
  delivery_fee        numeric(10,2) not null default 0,
  total               numeric(10,2) not null default 0,
  -- Cupón aplicado
  coupon_code         text,
  coupon_id           uuid references public.coupons(id),
  -- Estado del pedido
  status              text not null default 'received'
                      check (status in ('received','accepted','preparing','ready','on_the_way','delivered','cancelled')),
  cancellation_reason text,
  -- Extras
  notes               text,
  table_number        text,
  estimated_time_min  smallint,
  -- POS
  pos_session_id      uuid references public.pos_sessions(id),
  -- Metadatos
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_orders_restaurant     on public.orders(restaurant_id);
create index idx_orders_status         on public.orders(restaurant_id, status);
create index idx_orders_created        on public.orders(restaurant_id, created_at desc);
create index idx_orders_pos_session    on public.orders(pos_session_id);


-- ============================================================
-- 12. TABLA: kitchen_tickets
-- Comandas que ve el equipo de cocina
-- ============================================================
create table public.kitchen_tickets (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  -- Snapshot de los items al momento de crear el ticket
  -- [{name, quantity, notes, status: 'pending'|'done'}]
  items           jsonb not null default '[]',
  status          text not null default 'queued' check (status in ('queued', 'cooking', 'done', 'cancelled')),
  priority        smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_kitchen_tickets_restaurant  on public.kitchen_tickets(restaurant_id);
create index idx_kitchen_tickets_status      on public.kitchen_tickets(restaurant_id, status);
create index idx_kitchen_tickets_order       on public.kitchen_tickets(order_id);


-- ============================================================
-- 13. TABLA: pos_transactions
-- Pagos registrados en el POS
-- ============================================================
create table public.pos_transactions (
  id              uuid primary key default uuid_generate_v4(),
  pos_session_id  uuid not null references public.pos_sessions(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  payment_method  text not null check (payment_method in ('cash', 'card', 'transfer')),
  amount          numeric(10,2) not null,
  change_amount   numeric(10,2) not null default 0,
  reference       text,       -- número de referencia para transferencias
  created_at      timestamptz not null default now()
);

create index idx_pos_transactions_session     on public.pos_transactions(pos_session_id);
create index idx_pos_transactions_restaurant  on public.pos_transactions(restaurant_id);


-- ============================================================
-- 14. FUNCIÓN: updated_at automático
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Aplicar trigger a todas las tablas con updated_at
create trigger trg_restaurants_updated_at    before update on public.restaurants    for each row execute function public.handle_updated_at();
create trigger trg_menus_updated_at          before update on public.menus          for each row execute function public.handle_updated_at();
create trigger trg_products_updated_at       before update on public.products       for each row execute function public.handle_updated_at();
create trigger trg_combos_updated_at         before update on public.combos         for each row execute function public.handle_updated_at();
create trigger trg_discounts_updated_at      before update on public.discounts      for each row execute function public.handle_updated_at();
create trigger trg_orders_updated_at         before update on public.orders         for each row execute function public.handle_updated_at();
create trigger trg_kitchen_tickets_updated_at before update on public.kitchen_tickets for each row execute function public.handle_updated_at();


-- ============================================================
-- 15. FUNCIÓN: crear kitchen_ticket automáticamente
-- Se dispara cuando una orden cambia a 'accepted'
-- ============================================================
create or replace function public.create_kitchen_ticket()
returns trigger language plpgsql security definer as $$
begin
  -- Solo crear ticket si la orden pasa a 'accepted' (o se crea como POS directamente)
  if (new.status = 'accepted' and (old.status is null or old.status = 'received'))
     or (new.source = 'pos' and new.status = 'received' and old is null)
  then
    insert into public.kitchen_tickets (order_id, restaurant_id, items, status)
    values (new.id, new.restaurant_id, new.items, 'queued');
  end if;

  -- Cancelar ticket si la orden se cancela
  if new.status = 'cancelled' and old.status != 'cancelled' then
    update public.kitchen_tickets
    set status = 'cancelled'
    where order_id = new.id and status != 'done';
  end if;

  return new;
end;
$$;

create trigger trg_order_kitchen_ticket
  after insert or update of status on public.orders
  for each row execute function public.create_kitchen_ticket();


-- ============================================================
-- 16. FUNCIÓN: marcar orden como 'ready' cuando cocina termina
-- ============================================================
create or replace function public.sync_order_from_kitchen()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'done' and old.status != 'done' then
    update public.orders
    set status = 'ready'
    where id = new.order_id and status = 'preparing';
  end if;
  return new;
end;
$$;

create trigger trg_kitchen_sync_order
  after update of status on public.kitchen_tickets
  for each row execute function public.sync_order_from_kitchen();


-- ============================================================
-- 17. FUNCIÓN: actualizar total de pos_session al cerrar
-- ============================================================
create or replace function public.calculate_session_total()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'closed' and old.status = 'open' then
    select coalesce(sum(amount), 0)
    into new.total_sales
    from public.pos_transactions
    where pos_session_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_pos_session_total
  before update of status on public.pos_sessions
  for each row execute function public.calculate_session_total();


-- ============================================================
-- 18. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
alter table public.restaurants        enable row level security;
alter table public.restaurant_hours   enable row level security;
alter table public.menus              enable row level security;
alter table public.categories         enable row level security;
alter table public.products           enable row level security;
alter table public.combos             enable row level security;
alter table public.discounts          enable row level security;
alter table public.coupons            enable row level security;
alter table public.coupon_uses        enable row level security;
alter table public.orders             enable row level security;
alter table public.kitchen_tickets    enable row level security;
alter table public.pos_sessions       enable row level security;
alter table public.pos_transactions   enable row level security;


-- ============================================================
-- POLÍTICAS: restaurants
-- ============================================================

-- El dueño puede ver y gestionar sus propios restaurantes
create policy "owner_all_restaurants" on public.restaurants
  for all using (owner_id = auth.uid());

-- El público puede leer restaurantes activos por slug (storefront)
create policy "public_read_restaurants" on public.restaurants
  for select using (is_active = true);


-- ============================================================
-- POLÍTICAS: restaurant_hours
-- ============================================================
create policy "owner_all_restaurant_hours" on public.restaurant_hours
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "public_read_restaurant_hours" on public.restaurant_hours
  for select using (true); -- público puede leer horarios


-- ============================================================
-- POLÍTICAS: menus
-- ============================================================
create policy "owner_all_menus" on public.menus
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "public_read_active_menus" on public.menus
  for select using (is_active = true);


-- ============================================================
-- POLÍTICAS: categories
-- ============================================================
create policy "owner_all_categories" on public.categories
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "public_read_active_categories" on public.categories
  for select using (is_active = true);


-- ============================================================
-- POLÍTICAS: products
-- ============================================================
create policy "owner_all_products" on public.products
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "public_read_active_products" on public.products
  for select using (is_active = true);


-- ============================================================
-- POLÍTICAS: combos
-- ============================================================
create policy "owner_all_combos" on public.combos
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

create policy "public_read_active_combos" on public.combos
  for select using (is_active = true);


-- ============================================================
-- POLÍTICAS: discounts
-- ============================================================
create policy "owner_all_discounts" on public.discounts
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

-- El público puede leer descuentos activos y vigentes (para mostrar precios en storefront)
create policy "public_read_active_discounts" on public.discounts
  for select using (
    is_active = true
    and (expires_at is null or expires_at > now())
    and (starts_at is null or starts_at <= now())
  );


-- ============================================================
-- POLÍTICAS: coupons
-- ============================================================
create policy "owner_all_coupons" on public.coupons
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

-- El público puede leer cupones activos para validar al checkout
create policy "public_read_active_coupons" on public.coupons
  for select using (
    is_active = true
    and (expires_at is null or expires_at > now())
  );


-- ============================================================
-- POLÍTICAS: coupon_uses
-- ============================================================
create policy "owner_read_coupon_uses" on public.coupon_uses
  for select using (
    coupon_id in (
      select c.id from public.coupons c
      join public.restaurants r on c.restaurant_id = r.id
      where r.owner_id = auth.uid()
    )
  );

-- Cualquiera puede insertar un uso de cupón (clientes anónimos al hacer checkout)
create policy "public_insert_coupon_use" on public.coupon_uses
  for insert with check (true);


-- ============================================================
-- POLÍTICAS: orders
-- ============================================================
create policy "owner_all_orders" on public.orders
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

-- Clientes pueden crear órdenes en restaurantes activos
create policy "public_insert_order" on public.orders
  for insert with check (
    restaurant_id in (
      select id from public.restaurants where is_active = true
    )
  );

-- Clientes pueden leer su propia orden por ID (para la página de seguimiento)
create policy "public_read_own_order" on public.orders
  for select using (true); -- proteger con el ID de la orden en la URL (UUID no adivinable)


-- ============================================================
-- POLÍTICAS: kitchen_tickets
-- ============================================================
create policy "owner_all_kitchen_tickets" on public.kitchen_tickets
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

-- La pantalla de cocina puede actualizar tickets (cuando esté en sesión autenticada)
-- En v1, la cocina usa la misma sesión del dueño


-- ============================================================
-- POLÍTICAS: pos_sessions
-- ============================================================
create policy "owner_all_pos_sessions" on public.pos_sessions
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );


-- ============================================================
-- POLÍTICAS: pos_transactions
-- ============================================================
create policy "owner_all_pos_transactions" on public.pos_transactions
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );


-- ============================================================
-- 19. REALTIME — habilitar publicación en tablas clave
-- ============================================================
-- Ejecutar esto en el SQL Editor de Supabase:

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.kitchen_tickets;


-- ============================================================
-- 20. STORAGE — bucket para imágenes
-- ============================================================
-- Crear en Supabase Dashboard → Storage, o con estos inserts:

insert into storage.buckets (id, name, public)
values ('restaurant-assets', 'restaurant-assets', true);

-- Política: cualquiera puede leer imágenes (bucket público)
create policy "public_read_assets" on storage.objects
  for select using (bucket_id = 'restaurant-assets');

-- Solo dueños autenticados pueden subir/borrar imágenes
create policy "auth_upload_assets" on storage.objects
  for insert with check (
    bucket_id = 'restaurant-assets'
    and auth.role() = 'authenticated'
  );

create policy "auth_delete_assets" on storage.objects
  for delete using (
    bucket_id = 'restaurant-assets'
    and auth.role() = 'authenticated'
  );


-- ============================================================
-- 21. DATOS INICIALES — insertar al registrar restaurante
-- (Ejecutar desde la app después del signup, no aquí)
-- ============================================================
-- Ejemplo de lo que debe ejecutar el onboarding:
--
-- insert into public.restaurants (owner_id, name, slug, timezone)
-- values (auth.uid(), 'Mi Restaurante', 'mi-restaurante', 'America/Hermosillo');
--
-- insert into public.restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
-- select id, generate_series(0,6), '09:00', '22:00', false
-- from public.restaurants where owner_id = auth.uid();
-- (Ajustar domingo = cerrado: update ... set is_closed=true where day_of_week=0)


-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================
-- Tablas creadas: 13
-- Funciones/Triggers: 5
-- Políticas RLS: 26
-- Storage: 1 bucket con 3 políticas
-- Realtime: orders + kitchen_tickets
-- ============================================================
