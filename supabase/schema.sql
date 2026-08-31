-- Operación NoFap September — schema + RLS
--
-- Modelo de auth: no hay email/password. Cada dispositivo obtiene una sesión
-- anónima de Supabase (`supabase.auth.signInAnonymously()`, ver src/lib/auth.ts)
-- que da un auth.uid() real sin pedir credenciales. users.auth_id vincula esa
-- sesión con la fila de la app. El PIN de 4 dígitos NUNCA se hashea ni se
-- compara en el cliente: todo el alta/reclamo de nombre pasa por la función
-- claim_user() de más abajo, que corre con privilegios elevados.
--
-- Setup requerido después de correr este archivo (una sola vez, en el SQL
-- editor de Supabase), fuera de este archivo para no commitear el secreto:
--   insert into app_config (key, value) values ('pin_pepper', '<mismo valor que PIN_PEPPER en .env>');
-- Sin esto, claim_user() rechaza cualquier alta con un error explícito. Iría
-- como un GUC (`ALTER DATABASE ... SET`), pero Supabase gestionado no da ese
-- privilegio ni al rol `postgres` del SQL editor — de ahí la tabla de abajo.

create extension if not exists pgcrypto;

-- ============================================================================
-- users
-- ============================================================================

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pin_hash text not null,
  auth_id uuid unique references auth.users (id) on delete set null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table users enable row level security;

-- Sin policies de select/insert/update para anon/authenticated: la tabla
-- cruda (con pin_hash) solo la toca claim_user(), que es SECURITY DEFINER.
revoke all on users from anon, authenticated;

-- Vista de lectura pública: lo que necesitan ranking/feed/chequeo de nombre,
-- sin pin_hash ni auth_id. A propósito SIN security_invoker: debe correr con
-- los privilegios de quien la creó (dueño de la tabla), porque revocamos
-- todo acceso directo a `users` para anon/authenticated más arriba — si
-- corriera con los privilegios del que consulta, fallaría siempre.
create view public_users as
  select id, name, created_at, is_admin from users;

grant select on public_users to authenticated;

-- Helper para las policies de abajo: las subqueries dentro de una policy
-- corren con los privilegios de quien hace el INSERT/UPDATE, así que un
-- `select id from users where auth_id = auth.uid()` directo fallaría por el
-- revoke de arriba. Esta función SECURITY DEFINER hace ese lookup con
-- privilegios elevados y solo devuelve el id propio del que llama.
create or replace function current_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from users where auth_id = auth.uid();
$$;

grant execute on function current_user_id () to authenticated;

-- ============================================================================
-- daily_entries
-- ============================================================================

create table daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  date date not null,
  status text not null check (status in ('en_pie', 'caido', 'pendiente')),
  reported_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table daily_entries enable row level security;

create policy "daily_entries_select_all"
on daily_entries for select
to authenticated
using (true);

create policy "daily_entries_insert_own"
on daily_entries for insert
to authenticated
with check (user_id = current_user_id());

-- Sin policy de update/delete: un día confirmado es inmutable por diseño
-- (RLS deniega por defecto lo que no tiene policy explícita). El status
-- 'pendiente' del check existe por fidelidad al modelo de datos del spec
-- pero la app nunca lo persiste: el único insert ocurre al confirmar, con
-- el status final. La resolución de días vencidos (ausencia de fila +
-- ventana cerrada = caído) vive en src/lib/scoring.ts, no en la base.

-- ============================================================================
-- entry_objectives
-- ============================================================================

create table entry_objectives (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references daily_entries (id) on delete cascade,
  objective_key text not null,
  completed boolean not null default false,
  unique (entry_id, objective_key)
);

alter table entry_objectives enable row level security;

create policy "entry_objectives_select_all"
on entry_objectives for select
to authenticated
using (true);

create policy "entry_objectives_insert_own"
on entry_objectives for insert
to authenticated
with check (
  entry_id in (select id from daily_entries where user_id = current_user_id())
);

-- Igual que daily_entries: sin policy de update/delete, inmutable por diseño.

-- ============================================================================
-- push_subscriptions
-- ============================================================================

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
on push_subscriptions for select
to authenticated
using (user_id = current_user_id());

create policy "push_subscriptions_insert_own"
on push_subscriptions for insert
to authenticated
with check (user_id = current_user_id());

-- A diferencia de daily_entries/entry_objectives, esta tabla no es de
-- negocio inmutable: una resuscripción del navegador puede traer p256dh/auth
-- nuevos para el mismo endpoint, así que sí se permite upsert sobre lo propio.
create policy "push_subscriptions_update_own"
on push_subscriptions for update
to authenticated
using (user_id = current_user_id())
with check (user_id = current_user_id());

-- Las API routes (/api/cron/reminders, /api/notify-fall) usan la service
-- role key y bypassean RLS por completo: no necesitan policies propias.

-- ============================================================================
-- app_config: única fila con el pepper del PIN. Mismo patrón que `users`:
-- RLS habilitada sin policies + revoke, así que solo un SECURITY DEFINER
-- (claim_user, más abajo) puede leerla.
-- ============================================================================

create table app_config (
  key text primary key,
  value text not null
);

alter table app_config enable row level security;
revoke all on app_config from anon, authenticated;

-- ============================================================================
-- claim_user: único punto de escritura sobre `users`
-- ============================================================================

create or replace function claim_user(p_name text, p_pin text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user users%rowtype;
  v_pepper text;
  v_computed_hash text;
begin
  select value into v_pepper from app_config where key = 'pin_pepper';

  if v_pepper is null or v_pepper = '' then
    raise exception 'app_config.pin_pepper no está configurado en la base';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Nombre inválido';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'El PIN debe ser de 4 dígitos';
  end if;

  v_computed_hash := encode(digest(p_pin || v_pepper, 'sha256'), 'hex');

  select * into v_user from users where users.name = p_name;

  if not found then
    insert into users (name, pin_hash, auth_id)
    values (p_name, v_computed_hash, auth.uid())
    returning * into v_user;
  else
    if v_user.pin_hash <> v_computed_hash then
      raise exception 'PIN incorrecto';
    end if;

    update users
    set auth_id = auth.uid()
    where users.id = v_user.id
    returning * into v_user;
  end if;

  return query select v_user.id, v_user.name;
end;
$$;

grant execute on function claim_user (text, text) to authenticated;

-- ============================================================================
-- confirm_check_in: escribe daily_entries + entry_objectives de una sola vez.
-- "Confirmar guarda todo junto" (spec) — hecho como función en vez de dos
-- inserts separados desde el cliente para que sea atómico: si algo falla a
-- mitad de camino, no queda un día a medio confirmar.
-- ============================================================================

create or replace function confirm_check_in(p_date date, p_status text, p_objectives jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := current_user_id();
  v_entry_id uuid;
  v_key text;
begin
  if v_user_id is null then
    raise exception 'Usuario no identificado';
  end if;

  if p_status not in ('en_pie', 'caido') then
    raise exception 'Status inválido: %', p_status;
  end if;

  insert into daily_entries (user_id, date, status)
  values (v_user_id, p_date, p_status)
  returning id into v_entry_id;

  for v_key in select jsonb_object_keys(p_objectives)
  loop
    insert into entry_objectives (entry_id, objective_key, completed)
    values (v_entry_id, v_key, (p_objectives ->> v_key)::boolean);
  end loop;

  return v_entry_id;
end;
$$;

grant execute on function confirm_check_in (date, text, jsonb) to authenticated;

-- Mismo motivo que current_user_id(): una policy no puede consultar `users`
-- directo (revocado más arriba), así que este chequeo también necesita
-- privilegios elevados.
create or replace function is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from users where auth_id = auth.uid()), false);
$$;

grant execute on function is_current_user_admin () to authenticated;

-- ============================================================================
-- announcements: comunicados del mando (texto + foto opcional) para el feed.
-- Solo lectura abierta; escritura restringida a usuarios con is_admin = true.
-- ============================================================================

create table announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users (id) on delete cascade,
  message text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

create policy "announcements_select_all"
on announcements for select
to authenticated
using (true);

create policy "announcements_insert_admin"
on announcements for insert
to authenticated
with check (author_id = current_user_id() and is_current_user_admin());

create policy "announcements_delete_admin"
on announcements for delete
to authenticated
using (is_current_user_admin());

-- Bucket público para las fotos de los comunicados (la app es privada de por
-- sí, detrás del código de acceso + login — no hace falta URL firmada).
insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', true)
on conflict (id) do nothing;

create policy "announcements_bucket_insert_admin"
on storage.objects for insert
to authenticated
with check (bucket_id = 'announcements' and is_current_user_admin());

create policy "announcements_bucket_delete_admin"
on storage.objects for delete
to authenticated
using (bucket_id = 'announcements' and is_current_user_admin());

-- ============================================================================
-- announcement_reactions: cualquier usuario (no solo admin) puede reaccionar
-- a un comunicado con cualquier emoji — una reacción por usuario y comunicado
-- (reaccionar de nuevo reemplaza el emoji anterior, vía upsert).
-- ============================================================================

create table announcement_reactions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

alter table announcement_reactions enable row level security;

create policy "announcement_reactions_select_all"
on announcement_reactions for select
to authenticated
using (true);

create policy "announcement_reactions_insert_own"
on announcement_reactions for insert
to authenticated
with check (user_id = current_user_id());

create policy "announcement_reactions_update_own"
on announcement_reactions for update
to authenticated
using (user_id = current_user_id())
with check (user_id = current_user_id());

create policy "announcement_reactions_delete_own"
on announcement_reactions for delete
to authenticated
using (user_id = current_user_id());
