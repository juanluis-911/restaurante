-- ============================================================
-- USER PROFILES — Ejecutar en Supabase SQL Editor
-- Almacena el rol de cada usuario registrado en la plataforma
-- ============================================================

create table public.user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('restaurant_owner', 'driver', 'customer')),
  created_at timestamptz not null default now()
);

comment on table public.user_profiles is
  'Rol del usuario: restaurant_owner, driver o customer';

-- Índice para lookup rápido por rol
create index idx_user_profiles_role on public.user_profiles(role);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.user_profiles enable row level security;

-- Cada usuario solo puede leer su propio perfil
create policy "own_profile_select"
  on public.user_profiles for select
  using (auth.uid() = id);

-- Cada usuario solo puede insertar su propio perfil (una sola vez, PK)
create policy "own_profile_insert"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- NOTA: Después de ejecutar este script, regenera los tipos:
--   supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.ts
-- ============================================================
