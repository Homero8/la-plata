-- La Plata · base de datos para varios usuarios (Supabase)
-- Pégalo entero en Supabase → SQL Editor → New query → Run. Se puede ejecutar más de una vez.

-- 1. Tablas ---------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  config     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.movimientos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  fecha      date not null,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists movimientos_user_fecha on public.movimientos (user_id, fecha);

create table if not exists public.notas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  texto      text not null check (char_length(texto) <= 2000),
  created_at timestamptz not null default now()
);

-- Invitaciones de solo lectura: un código = una persona
create table if not exists public.shares (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users on delete cascade,
  owner_name text,
  code       text not null unique,
  viewer_id  uuid references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. ¿Quién puede ver los datos de quién? ----------------------------------
create or replace function public.can_view(owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select owner = auth.uid()
      or exists (select 1 from public.shares s where s.owner_id = owner and s.viewer_id = auth.uid());
$$;

-- Canjear un código de invitación (lo llama quien recibe el código)
create or replace function public.redeem_share(p_code text)
returns table (owner_id uuid, owner_name text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'no-session'; end if;
  return query
    update public.shares s set viewer_id = auth.uid()
     where upper(s.code) = upper(trim(p_code)) and s.viewer_id is null and s.owner_id <> auth.uid()
    returning s.owner_id, s.owner_name;
end $$;

-- Borrar mi cuenta y todos mis datos
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'no-session'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.redeem_share(text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.redeem_share(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.can_view(uuid) to authenticated;

-- 3. Seguridad por fila --------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.movimientos enable row level security;
alter table public.notas       enable row level security;
alter table public.shares      enable row level security;

drop policy if exists "ver perfil"      on public.profiles;
drop policy if exists "crear perfil"    on public.profiles;
drop policy if exists "editar perfil"   on public.profiles;
drop policy if exists "borrar perfil"   on public.profiles;
create policy "ver perfil"    on public.profiles for select to authenticated using (public.can_view(user_id));
create policy "crear perfil"  on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "editar perfil" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "borrar perfil" on public.profiles for delete to authenticated using (user_id = auth.uid());

drop policy if exists "ver movs"    on public.movimientos;
drop policy if exists "crear movs"  on public.movimientos;
drop policy if exists "editar movs" on public.movimientos;
drop policy if exists "borrar movs" on public.movimientos;
create policy "ver movs"    on public.movimientos for select to authenticated using (public.can_view(user_id));
create policy "crear movs"  on public.movimientos for insert to authenticated with check (user_id = auth.uid());
create policy "editar movs" on public.movimientos for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "borrar movs" on public.movimientos for delete to authenticated using (user_id = auth.uid());

drop policy if exists "mis notas" on public.notas;
create policy "mis notas" on public.notas for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "ver invitaciones"    on public.shares;
drop policy if exists "crear invitaciones"  on public.shares;
drop policy if exists "borrar invitaciones" on public.shares;
create policy "ver invitaciones"    on public.shares for select to authenticated using (owner_id = auth.uid() or viewer_id = auth.uid());
create policy "crear invitaciones"  on public.shares for insert to authenticated with check (owner_id = auth.uid() and viewer_id is null);
create policy "borrar invitaciones" on public.shares for delete to authenticated using (owner_id = auth.uid() or viewer_id = auth.uid());
