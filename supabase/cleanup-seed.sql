-- =============================================================================
-- PointParts — remove os dados de exemplo criados por supabase/seed.sql
-- Apaga SOMENTE os fornecedores e peças de exemplo (pelos nomes exatos) e, em
-- cascata, seus preços e histórico. Não mexe em nada que você cadastrou.
-- Se você renomeou algum item de exemplo, ele não será apagado.
-- =============================================================================
do $$
declare
  n_parts int; n_suppliers int;
begin
  delete from public.parts
   where name in (
     'Tela Soft OLED iPhone 15', 'Tela Incell iPhone 15', 'Tela OLED iPhone 15 Pro',
     'Bateria iPhone 13', 'Tela Incell iPhone 11', 'Conector de carga Galaxy A54',
     'Tela OLED Galaxy S23');
  get diagnostics n_parts = row_count;

  delete from public.suppliers
   where name in ('Fornecedor Alfa', 'Fornecedor Beta', 'Fornecedor Gama', 'Fornecedor Delta', 'Fornecedor Épsilon');
  get diagnostics n_suppliers = row_count;

  raise notice 'Removidas % peças e % fornecedores de exemplo.', n_parts, n_suppliers;
end $$;
