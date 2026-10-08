-- =============================================================================
-- PointParts — a pesquisa passa a considerar também as observações da peça
-- (ex.: lista de aparelhos compatíveis: "A23 4G / M23 / M33 / A73").
-- Execute depois das migrations anteriores. Pode ser executado mais de uma vez.
-- =============================================================================
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
    p.notes,
    (select string_agg(sp.supplier_code, ' ') from public.supplier_parts sp where sp.part_id = p.id)
  ));
$$;

-- recalcula o texto de busca das peças já cadastradas
update public.parts set name = name;
