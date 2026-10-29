-- Remove somente exemplos registrados por ID pelo seed atualizado.
-- Exemplos antigos sem registro de procedência são preservados.
-- Alterações posteriores e vínculos/históricos reais também são preservados.
begin;

-- Impede novos vínculos/edições entre a verificação e a exclusão.
lock table public.parts, public.suppliers, public.supplier_parts, public.price_history
  in share row exclusive mode;

create temp table _seed_parts_to_delete on commit drop as
select p.id from public.parts p
join pointparts_private.seed_records r on r.entity = 'parts' and r.record_id = p.id
where to_jsonb(p) = r.snapshot
  and not exists (
    select 1 from public.supplier_parts sp
    where sp.part_id = p.id and not exists (
      select 1 from pointparts_private.seed_records sr
      where sr.entity = 'supplier_parts' and sr.record_id = sp.id and sr.snapshot = to_jsonb(sp)))
  and not exists (
    select 1 from public.price_history h
    where h.part_id = p.id and not exists (
      select 1 from pointparts_private.seed_records sr
      where sr.entity = 'price_history' and sr.record_id = h.id and sr.snapshot = to_jsonb(h)));

-- Só exclui fornecedores sem vínculo/histórico fora das peças acima.
create temp table _seed_suppliers_to_delete on commit drop as
select s.id from public.suppliers s
join pointparts_private.seed_records r on r.entity = 'suppliers' and r.record_id = s.id
where to_jsonb(s) = r.snapshot
  and not exists (
    select 1 from public.supplier_parts sp where sp.supplier_id = s.id
      and sp.part_id not in (select id from _seed_parts_to_delete))
  and not exists (
    select 1 from public.price_history h where h.supplier_id = s.id
      and h.part_id not in (select id from _seed_parts_to_delete));

delete from public.parts where id in (select id from _seed_parts_to_delete);
delete from public.suppliers where id in (select id from _seed_suppliers_to_delete);

-- Remove as marcações apenas dos registros que de fato deixaram de existir.
delete from pointparts_private.seed_records r
where (r.entity = 'parts' and not exists (select 1 from public.parts p where p.id = r.record_id))
   or (r.entity = 'suppliers' and not exists (select 1 from public.suppliers s where s.id = r.record_id))
   or (r.entity = 'supplier_parts' and not exists (select 1 from public.supplier_parts sp where sp.id = r.record_id))
   or (r.entity = 'price_history' and not exists (select 1 from public.price_history h where h.id = r.record_id));

select (select count(*) from _seed_parts_to_delete) as pecas_removidas,
       (select count(*) from _seed_suppliers_to_delete) as fornecedores_removidos;
commit;
