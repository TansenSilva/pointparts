-- =============================================================================
-- PointParts — funções de pesquisa, comparação e dashboard
-- Todas rodam como o usuário logado (security invoker), então o RLS se aplica.
-- =============================================================================

-- Visão de histórico com nomes (para a tela de histórico e futuros gráficos)
create or replace view public.price_history_detailed
with (security_invoker = true) as
select
  h.id,
  h.created_at,
  h.old_price,
  h.new_price,
  h.part_id,
  p.name as part_name,
  h.supplier_id,
  s.name as supplier_name,
  h.supplier_part_id
from public.price_history h
join public.parts p on p.id = h.part_id
join public.suppliers s on s.id = h.supplier_id;

-- -----------------------------------------------------------------------------
-- search_parts: pesquisa + filtros + ordenação + paginação, já com o melhor preço.
--
-- Pesquisa: cada palavra digitada precisa aparecer em algum lugar do search_text
-- (nome, categoria, marca, modelo, tecnologia, qualidade, códigos), em qualquer
-- ordem, sem acento e sem diferenciar maiúsculas. O índice GIN trigram acelera
-- os LIKE '%palavra%'.
--
-- Melhor preço (fornecedores ativos primeiro): o menor preço entre os "Em estoque". Se nenhum
-- estiver em estoque, o menor entre "Sob consulta/Não informado"; por último,
-- o menor entre os "Sem estoque".
--
-- p_sort: name | relevance | price_asc | recent | stale
-- -----------------------------------------------------------------------------
create or replace function public.search_parts(
  p_query        text    default null,
  p_category     uuid    default null,
  p_brand        text    default null,
  p_model        text    default null,
  p_technology   text    default null,
  p_quality      text    default null,
  p_supplier     uuid    default null,
  p_availability text    default null,
  p_active       boolean default null,
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
  total_count        bigint
)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select array_remove(string_to_array(public.norm_text(p_query), ' '), '') as tokens
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
      and (p_supplier is null or exists (
            select 1 from public.supplier_parts sp
            where sp.part_id = p.id and sp.supplier_id = p_supplier))
      and (p_availability is null or exists (
            select 1 from public.supplier_parts sp
            where sp.part_id = p.id and sp.availability = p_availability))
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
    from public.supplier_parts sp
    where sp.part_id in (select f.id from filtered f)
    group by sp.part_id
  ),
  best as (
    select distinct on (sp.part_id)
           sp.part_id, sp.price, sp.supplier_id, sp.availability, s.name as supplier_name
    from public.supplier_parts sp
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
    count(*) over ()
  from filtered f
  join public.categories c on c.id = f.category_id
  left join agg a on a.part_id = f.id
  left join best b on b.part_id = f.id
  order by
    case when p_sort = 'price_asc' then b.price end asc nulls last,
    case when p_sort = 'recent'    then a.last_checked_at end desc nulls last,
    case when p_sort = 'stale'     then a.oldest_checked_at end asc nulls last,
    case when p_sort = 'relevance' then length(f.name) end asc,
    f.name asc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
$$;

-- Valores distintos para os filtros da página de peças
create or replace function public.part_filter_options()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'brands',       coalesce((select jsonb_agg(v order by v) from (select distinct brand v from public.parts where brand is not null and brand <> '') x), '[]'::jsonb),
    'models',       coalesce((select jsonb_agg(v order by v) from (select distinct device_model v from public.parts where device_model is not null and device_model <> '') x), '[]'::jsonb),
    'technologies', coalesce((select jsonb_agg(v order by v) from (select distinct technology v from public.parts where technology is not null and technology <> '') x), '[]'::jsonb),
    'qualities',    coalesce((select jsonb_agg(v order by v) from (select distinct quality v from public.parts where quality is not null and quality <> '') x), '[]'::jsonb)
  );
$$;

-- -----------------------------------------------------------------------------
-- find_similar_parts: peças com nome parecido (mesmas palavras em outra ordem,
-- por exemplo). Usa similaridade de Jaccard entre as palavras dos nomes e exige
-- que os números de modelo (15, S24, A54...) sejam os mesmos.
-- -----------------------------------------------------------------------------
create or replace function public.find_similar_parts(
  p_name    text,
  p_exclude uuid default null,
  p_limit   int  default 5
)
returns table (
  id            uuid,
  name          text,
  category_name text,
  brand         text,
  device_model  text,
  similarity    numeric
)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select array(select distinct t from unnest(string_to_array(public.norm_text(p_name), ' ')) t where t <> '') as tokens
  ),
  scored as (
    select p.id, p.name, p.brand, p.device_model, p.category_id,
           (select count(*) from unnest(q.tokens) t
              where t = any(string_to_array(public.norm_text(p.name), ' '))) as inter,
           (select count(distinct t) from unnest(string_to_array(public.norm_text(p.name), ' ') || q.tokens) t
              where t <> '') as uni
    from public.parts p, q
    where p.id is distinct from p_exclude
      and cardinality(q.tokens) > 0
      -- números de modelo diferentes (S23 x S24, 13 x 15) indicam peças diferentes
      and coalesce((select array_agg(t order by t) from unnest(q.tokens) t where t ~ '[0-9]'), '{}')
          = coalesce((select array_agg(distinct t order by t) from unnest(string_to_array(public.norm_text(p.name), ' ')) t where t ~ '[0-9]'), '{}')
  )
  select s.id, s.name, c.name, s.brand, s.device_model,
         round(s.inter::numeric / nullif(s.uni, 0), 2)
  from scored s
  join public.categories c on c.id = s.category_id
  where s.uni > 0 and s.inter::numeric / s.uni >= 0.6
  order by 6 desc, s.name
  limit greatest(p_limit, 1);
$$;

-- -----------------------------------------------------------------------------
-- create_part_with_offers: cadastro rápido em uma única transação.
-- p_part:   {name, category_id, brand, device_model, technology, quality,
--            internal_code, manufacturer_code, notes, active}
-- p_offers: [{supplier_id, price, availability, supplier_code, product_url, notes}]
-- -----------------------------------------------------------------------------
create or replace function public.create_part_with_offers(p_part jsonb, p_offers jsonb default '[]'::jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  o jsonb;
begin
  insert into public.parts (name, category_id, brand, device_model, technology, quality,
                            internal_code, manufacturer_code, notes, active)
  values (
    p_part ->> 'name',
    (p_part ->> 'category_id')::uuid,
    nullif(p_part ->> 'brand', ''),
    nullif(p_part ->> 'device_model', ''),
    nullif(p_part ->> 'technology', ''),
    nullif(p_part ->> 'quality', ''),
    nullif(p_part ->> 'internal_code', ''),
    nullif(p_part ->> 'manufacturer_code', ''),
    nullif(p_part ->> 'notes', ''),
    coalesce((p_part ->> 'active')::boolean, true)
  )
  returning id into v_id;

  for o in select * from jsonb_array_elements(coalesce(p_offers, '[]'::jsonb)) loop
    insert into public.supplier_parts (part_id, supplier_id, price, availability,
                                       supplier_code, product_url, notes)
    values (
      v_id,
      (o ->> 'supplier_id')::uuid,
      (o ->> 'price')::numeric,
      coalesce(nullif(o ->> 'availability', ''), 'unknown'),
      nullif(o ->> 'supplier_code', ''),
      nullif(o ->> 'product_url', ''),
      nullif(o ->> 'notes', '')
    );
  end loop;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- dashboard_stats
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_stats(p_stale_days int default 15)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'parts',      (select count(*) from public.parts),
    'suppliers',  (select count(*) from public.suppliers),
    'offers',     (select count(*) from public.supplier_parts),
    'updated_7d', (select count(*) from public.supplier_parts where checked_at >= now() - interval '7 days'),
    'stale',      (select count(*) from public.supplier_parts
                    where checked_at < now() - make_interval(days => greatest(p_stale_days, 0)))
  );
$$;

-- -----------------------------------------------------------------------------
-- Permissões: somente usuários autenticados executam as funções.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.search_parts(text, uuid, text, text, text, text, uuid, text, boolean, text, int, int),
  public.part_filter_options(),
  public.find_similar_parts(text, uuid, int),
  public.create_part_with_offers(jsonb, jsonb),
  public.dashboard_stats(int),
  public.is_admin(),
  public.norm_text(text),
  public.part_search_text(public.parts)
to authenticated;

grant select on public.price_history_detailed to authenticated;
