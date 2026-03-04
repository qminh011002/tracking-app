-- 1) Create brand table
create extension if not exists pgcrypto;

create table if not exists public.brand (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo text,
  created_at timestamptz not null default now()
);

-- 2) Insert brand Sony (idempotent)
insert into public.brand (name, logo)
values ('Sony', null)
on conflict (name) do nothing;

-- 3) Add brand_id to models (devices in /device page are models)
alter table public.models
add column if not exists brand_id uuid;

-- 4) Backfill existing models to Sony
update public.models m
set brand_id = b.id
from public.brand b
where b.name = 'Sony'
  and m.brand_id is null;

-- 5) Add foreign key if missing
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'models_brand_id_fkey'
  ) then
    alter table public.models
    add constraint models_brand_id_fkey
    foreign key (brand_id)
    references public.brand(id);
  end if;
end $$;

-- 6) Enforce not null after backfill
alter table public.models
alter column brand_id set not null;

-- 7) RLS + permissions for client access on brand
grant usage on schema public to anon, authenticated;
grant select on table public.brand to anon, authenticated;
grant insert, update, delete on table public.brand to authenticated;
grant references on table public.brand to authenticated;

alter table public.brand enable row level security;

drop policy if exists brand_select_all on public.brand;
create policy brand_select_all
on public.brand
for select
to anon, authenticated
using (true);

drop policy if exists brand_insert_authenticated on public.brand;
create policy brand_insert_authenticated
on public.brand
for insert
to authenticated
with check (true);

drop policy if exists brand_update_authenticated on public.brand;
create policy brand_update_authenticated
on public.brand
for update
to authenticated
using (true)
with check (true);

drop policy if exists brand_delete_authenticated on public.brand;
create policy brand_delete_authenticated
on public.brand
for delete
to authenticated
using (true);
