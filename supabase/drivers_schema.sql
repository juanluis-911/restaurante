-- ============================================================
-- DRIVERS SCHEMA — Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLA: drivers
-- Perfil del repartidor (ligado a auth.users)
-- ============================================================
create table public.drivers (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  name         text not null,
  whatsapp     text not null,
  vehicle_type text not null check (vehicle_type in ('moto', 'carro', 'bicicleta')),
  status       text not null default 'available'
               check (status in ('available', 'busy', 'offline')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_drivers_user    on public.drivers(user_id);
create index idx_drivers_status  on public.drivers(status);

create trigger trg_drivers_updated_at
  before update on public.drivers
  for each row execute function public.handle_updated_at();


-- ============================================================
-- 2. TABLA: restaurant_drivers
-- Drivers propios de un restaurante (cuando driver_mode = 'own')
-- ============================================================
create table public.restaurant_drivers (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  driver_id     uuid not null references public.drivers(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (restaurant_id, driver_id)
);

create index idx_restaurant_drivers_restaurant on public.restaurant_drivers(restaurant_id);
create index idx_restaurant_drivers_driver     on public.restaurant_drivers(driver_id);


-- ============================================================
-- 3. ALTER: restaurants — agregar driver_mode
-- ============================================================
alter table public.restaurants
  add column if not exists driver_mode text not null default 'global'
  check (driver_mode in ('global', 'own'));


-- ============================================================
-- 4. ALTER: orders — agregar driver_id
-- ============================================================
alter table public.orders
  add column if not exists driver_id uuid references public.drivers(id) on delete set null;

create index idx_orders_driver on public.orders(driver_id);


-- ============================================================
-- 5. RLS: drivers
-- ============================================================
alter table public.drivers enable row level security;

-- Cualquier usuario autenticado puede leer perfiles de drivers
create policy "auth_read_drivers" on public.drivers
  for select using (auth.role() = 'authenticated');

-- El propio driver puede actualizar su perfil y estado
create policy "driver_update_own" on public.drivers
  for update using (user_id = auth.uid());

-- Cualquier usuario autenticado puede insertar su perfil (registro)
create policy "driver_insert_own" on public.drivers
  for insert with check (user_id = auth.uid());

-- Lectura pública limitada para el order tracker (nombre, vehículo, whatsapp)
create policy "public_read_drivers" on public.drivers
  for select using (true);


-- ============================================================
-- 6. RLS: restaurant_drivers
-- ============================================================
alter table public.restaurant_drivers enable row level security;

-- El owner del restaurante puede gestionar sus drivers
create policy "owner_all_restaurant_drivers" on public.restaurant_drivers
  for all using (
    restaurant_id in (
      select id from public.restaurants where owner_id = auth.uid()
    )
  );

-- Los drivers pueden leer a qué restaurantes pertenecen
create policy "driver_read_own_assignments" on public.restaurant_drivers
  for select using (
    driver_id in (
      select id from public.drivers where user_id = auth.uid()
    )
  );


-- ============================================================
-- 7. RLS adicional en orders: driver puede tomar pedido
-- El driver puede actualizar driver_id y status en pedidos de delivery
-- sin driver asignado, siempre que sea un restaurante que le permita operar
-- ============================================================
-- (La política existente "owner_all_orders" ya cubre al owner)
-- Agregamos política para que drivers puedan actualizar el driver_id

create policy "driver_claim_order" on public.orders
  for update using (
    -- El pedido es de delivery
    order_type = 'delivery'
    -- El restaurante acepta drivers globales O el driver está en su lista
    and restaurant_id in (
      select r.id from public.restaurants r
      where r.driver_mode = 'global'
         or r.id in (
           select rd.restaurant_id
           from public.restaurant_drivers rd
           join public.drivers d on rd.driver_id = d.id
           where d.user_id = auth.uid()
         )
    )
    -- Solo si está en estado que permite asignación o si el driver ya es el asignado
    and status in ('accepted', 'preparing', 'ready', 'on_the_way')
  );


-- ============================================================
-- 8. REALTIME
-- ============================================================
alter publication supabase_realtime add table public.drivers;
-- orders ya está en realtime desde el schema base


-- ============================================================
-- FIN
-- ============================================================
-- Tablas nuevas: drivers, restaurant_drivers
-- Columnas nuevas: restaurants.driver_mode, orders.driver_id
-- Políticas RLS: 6 nuevas + 1 update en orders
-- ============================================================
