-- Corrige filtros combinados, data do melhor preço e consultas de peças ativas.
-- A alteração do retorno exige recriar a função; tudo ocorre na mesma transação.
begin;

-- '+' faz parte do modelo: XS e XS+ não são a mesma peça.
create or replace function public.norm_text(t text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select trim(regexp_replace(lower(extensions.unaccent(replace(coalesce(t, ''), '+', ' plus '))), '[^a-z0-9]+', ' ', 'g'));
$$;

drop function public.search_parts(text, uuid, text, text, text, text, uuid, text, boolean, text, int, int);

create or replace function public.search_parts(
  p_query        text    default null,
  p_category     uuid    default null,
  p_brand        text    default null,
  p_model        text    default null,
  p_technology   text    default null,
  p_quality      text    default null,
  p_supplier     uuid    default null,
  p_availability text    default null,
  p_active       boolean default true,
  p_sort         text    default 'name',
  p_limit        int     default 20,
  p_offset       int     default 0
)
returns table (
  id                 uuid,
  name               text,
  category_id        uuid,
  category_name      text,
  brand              text,
  device_model       text,
  technology         text,
  quality            text,
  internal_code      text,
  active             boolean,
  supplier_count     bigint,
  in_stock_count     bigint,
  best_price         numeric,
  best_supplier_id   uuid,
  best_supplier_name text,
  best_availability  text,
  last_checked_at    timestamptz,
  oldest_checked_at  timestamptz,
  total_count        bigint,
  best_checked_at    timestamptz
)
language sql
security invoker
stable
set search_path = public, extensions
as $$
  with q as (
    select array_remove(string_to_array(public.norm_text(p_query), ' '), '') as tokens
  ),
  eligible_offers as (
    select sp.* from public.supplier_parts sp
    where (p_supplier is null or sp.supplier_id = p_supplier)
      and (p_availability is null or sp.availability = p_availability)
  ),
  filtered as (
    select p.*
    from public.parts p, q
    where (p_active is null or p.active = p_active)
      and (p_category is null or p.category_id = p_category)
      and (p_brand is null or p.brand = p_brand)
      and (p_model is null or p.device_model = p_model)
      and (p_technology is null or p.technology = p_technology)
      and (p_quality is null or p.quality = p_quality)
      -- Fornecedor e estoque precisam corresponder à MESMA oferta.
      and ((p_supplier is null and p_availability is null) or exists (
            select 1 from eligible_offers sp where sp.part_id = p.id))
      and not exists (
            select 1 from unnest(q.tokens) tok
            where p.search_text not like '%' || replace(replace(replace(tok, '\', '\\'), '%', '\%'), '_', '\_') || '%')
  ),
  agg as (
    select sp.part_id,
           count(*)                                       as supplier_count,
           count(*) filter (where sp.availability = 'in_stock') as in_stock_count,
           max(sp.checked_at)                             as last_checked_at,
           min(sp.checked_at)                             as oldest_checked_at
    from eligible_offers sp
    where sp.part_id in (select f.id from filtered f)
    group by sp.part_id
  ),
  best as (
    select distinct on (sp.part_id)
           sp.part_id, sp.price, sp.supplier_id, sp.availability, sp.checked_at, s.name as supplier_name
    from eligible_offers sp
    join public.suppliers s on s.id = sp.supplier_id
    where sp.part_id in (select f.id from filtered f)
    order by sp.part_id,
             case when s.active then 0 else 1 end,
             case sp.availability when 'in_stock' then 0 when 'out_of_stock' then 2 else 1 end,
             sp.price,
             sp.checked_at desc
  )
  select
    f.id, f.name, f.category_id, c.name, f.brand, f.device_model, f.technology,
    f.quality, f.internal_code, f.active,
    coalesce(a.supplier_count, 0), coalesce(a.in_stock_count, 0),
    b.price, b.supplier_id, b.supplier_name, b.availability,
    a.last_checked_at, a.oldest_checked_at,
    count(*) over (), b.checked_at
  from filtered f
  join public.categories c on c.id = f.category_id
  left join agg a on a.part_id = f.id
  left join best b on b.part_id = f.id
  order by
    case when p_sort = 'price_asc' then b.price end asc nulls last,
    case when p_sort = 'recent'    then a.last_checked_at end desc nulls last,
    case when p_sort = 'stale'     then a.oldest_checked_at end asc nulls last,
    case when p_sort = 'relevance' then length(f.name) end asc,
    f.name asc, f.id asc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

revoke execute on function public.search_parts(text, uuid, text, text, text, text, uuid, text, boolean, text, int, int) from public, anon;
grant execute on function public.search_parts(text, uuid, text, text, text, text, uuid, text, boolean, text, int, int) to authenticated;

-- Registro privado de procedência dos exemplos. Sem backfill por nome:
-- exemplos antigos não identificados são preservados pela limpeza.
create schema if not exists pointparts_private;
revoke all on schema pointparts_private from public, anon, authenticated;
create table pointparts_private.seed_records (
  entity text not null check (entity in ('parts', 'suppliers', 'supplier_parts', 'price_history')),
  record_id uuid not null,
  snapshot jsonb not null,
  primary key (entity, record_id)
);
alter table pointparts_private.seed_records enable row level security;
revoke all on pointparts_private.seed_records from public, anon, authenticated;

-- Recalcula a busca para os modelos com '+' já existentes.
update public.parts set name = name;

notify pgrst, 'reload schema';
commit;
