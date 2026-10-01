-- =============================================================================
-- PointParts — schema base
-- Tabelas, índices, triggers e dados iniciais (categorias e configurações).
-- Execute este arquivo primeiro (SQL Editor do Supabase ou `supabase db push`).
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Texto de busca: minúsculas, sem acentos e só letras/números separados por espaço.
create or replace function public.norm_text(t text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select trim(regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '[^a-z0-9]+', ' ', 'g'));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (1:1 com auth.users) — base para vários usuários no futuro
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  name       text,
  role       text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Cria o profile automaticamente. O primeiro usuário do sistema vira administrador.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles) then 'user' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuário comum não pode promover a si mesmo.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Somente administradores podem alterar o papel de um usuário';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- -----------------------------------------------------------------------------
-- suppliers
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) > 0),
  contact_name  text,
  whatsapp      text,
  phone         text,
  email         text,
  website       text,
  site_login    text,
  notes         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index suppliers_name_unique on public.suppliers (lower(name));
create index suppliers_active_idx on public.suppliers (active);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index categories_name_unique on public.categories (lower(name));

insert into public.categories (name) values
  ('Tela'), ('Bateria'), ('Conector de carga'), ('Flex'), ('Câmera'),
  ('Tampa traseira'), ('Carcaça'), ('Alto-falante'), ('Auricular'),
  ('Microfone'), ('Botão'), ('Sensor'), ('Placa'), ('Outros');

-- -----------------------------------------------------------------------------
-- parts
-- search_text é mantido por triggers (ver abaixo) e usado pela pesquisa.
-- -----------------------------------------------------------------------------
create table public.parts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(trim(name)) > 0),
  category_id       uuid not null references public.categories (id) on delete restrict,
  brand             text,
  device_model      text,
  technology        text,
  quality           text,
  internal_code     text,
  manufacturer_code text,
  notes             text,
  active            boolean not null default true,
  search_text       text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index parts_name_idx on public.parts (name);
create index parts_brand_idx on public.parts (brand);
create index parts_device_model_idx on public.parts (device_model);
create index parts_category_idx on public.parts (category_id);
create index parts_active_idx on public.parts (active);
create index parts_search_trgm_idx on public.parts using gin (search_text extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- supplier_parts (oferta de um fornecedor para uma peça)
-- -----------------------------------------------------------------------------
create table public.supplier_parts (
  id            uuid primary key default gen_random_uuid(),
  part_id       uuid not null references public.parts (id) on delete cascade,
  supplier_id   uuid not null references public.suppliers (id) on delete cascade,
  supplier_code text,
  product_url   text,
  price         numeric(12, 2) not null check (price >= 0),
  availability  text not null default 'unknown'
                  check (availability in ('in_stock', 'out_of_stock', 'on_request', 'unknown')),
  notes         text,
  -- data em que o preço foi consultado/confirmado (base do indicador de desatualizado)
  checked_at    timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint supplier_parts_part_supplier_unique unique (part_id, supplier_id)
);

create index supplier_parts_part_idx on public.supplier_parts (part_id);
create index supplier_parts_supplier_idx on public.supplier_parts (supplier_id);
create index supplier_parts_checked_at_idx on public.supplier_parts (checked_at);
create index supplier_parts_price_idx on public.supplier_parts (price);

create trigger supplier_parts_set_updated_at
  before update on public.supplier_parts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- price_history — nunca é apagado ao remover um vínculo (só ao apagar peça/fornecedor)
-- part_id/supplier_id são denormalizados para consultas e gráficos sem joins.
-- -----------------------------------------------------------------------------
create table public.price_history (
  id               uuid primary key default gen_random_uuid(),
  supplier_part_id uuid references public.supplier_parts (id) on delete set null,
  part_id          uuid not null references public.parts (id) on delete cascade,
  supplier_id      uuid not null references public.suppliers (id) on delete cascade,
  old_price        numeric(12, 2),
  new_price        numeric(12, 2) not null,
  changed_by       uuid,
  created_at       timestamptz not null default now()
);

create index price_history_supplier_part_idx on public.price_history (supplier_part_id, created_at desc);
create index price_history_part_supplier_idx on public.price_history (part_id, supplier_id, created_at desc);
create index price_history_supplier_idx on public.price_history (supplier_id, created_at desc);
create index price_history_created_at_idx on public.price_history (created_at desc);

create or replace function public.log_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.price_history (supplier_part_id, part_id, supplier_id, old_price, new_price, changed_by)
    values (new.id, new.part_id, new.supplier_id, null, new.price, auth.uid());
  elsif new.price is distinct from old.price then
    insert into public.price_history (supplier_part_id, part_id, supplier_id, old_price, new_price, changed_by)
    values (new.id, new.part_id, new.supplier_id, old.price, new.price, auth.uid());
  end if;
  return new;
end;
$$;

create trigger supplier_parts_log_price
  after insert or update on public.supplier_parts
  for each row execute function public.log_price_change();

-- -----------------------------------------------------------------------------
-- settings (chave/valor)
-- -----------------------------------------------------------------------------
create table public.settings (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

insert into public.settings (key, value) values ('stale_days', '15'::jsonb);

-- -----------------------------------------------------------------------------
-- search_text das peças: nome, categoria, marca, modelo, tecnologia, qualidade,
-- códigos internos e códigos dos fornecedores.
-- -----------------------------------------------------------------------------
create or replace function public.part_search_text(p public.parts)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select public.norm_text(concat_ws(' ',
    p.name,
    (select c.name from public.categories c where c.id = p.category_id),
    p.brand,
    p.device_model,
    p.technology,
    p.quality,
    p.internal_code,
    p.manufacturer_code,
    (select string_agg(sp.supplier_code, ' ') from public.supplier_parts sp where sp.part_id = p.id)
  ));
$$;

create or replace function public.parts_before_write()
returns trigger
language plpgsql
as $$
begin
  new.search_text := public.part_search_text(new);
  new.updated_at := now();
  return new;
end;
$$;

create trigger parts_search_text
  before insert or update on public.parts
  for each row execute function public.parts_before_write();

-- Alterações em vínculos (códigos do fornecedor) e renomeação de categorias
-- reaplicam o search_text das peças afetadas.
create or replace function public.refresh_part_from_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'INSERT') then
    update public.parts set name = name where id = new.part_id;
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.part_id is distinct from new.part_id) then
    update public.parts set name = name where id = old.part_id;
  end if;
  return null;
end;
$$;

create trigger supplier_parts_refresh_part
  after insert or update of supplier_code, part_id or delete on public.supplier_parts
  for each row execute function public.refresh_part_from_offer();

create or replace function public.refresh_parts_from_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.parts set name = name where category_id = new.id;
  return null;
end;
$$;

create trigger categories_refresh_parts
  after update of name on public.categories
  for each row execute function public.refresh_parts_from_category();
