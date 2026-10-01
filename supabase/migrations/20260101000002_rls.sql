-- =============================================================================
-- PointParts — Row Level Security
-- Sem login (anon) não há acesso a nenhum dado. Usuários autenticados acessam
-- os dados do sistema; configurações e papéis só podem ser alterados por admin.
-- =============================================================================

alter table public.profiles       enable row level security;
alter table public.suppliers      enable row level security;
alter table public.categories     enable row level security;
alter table public.parts          enable row level security;
alter table public.supplier_parts enable row level security;
alter table public.price_history  enable row level security;
alter table public.settings       enable row level security;

-- profiles ----------------------------------------------------------------
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- INSERT é feito pelo trigger handle_new_user (security definer). DELETE só via cascade.

-- Tabelas de dados: acesso total para autenticados ----------------------------
create policy "suppliers_all" on public.suppliers
  for all to authenticated using (true) with check (true);
create policy "categories_all" on public.categories
  for all to authenticated using (true) with check (true);
create policy "parts_all" on public.parts
  for all to authenticated using (true) with check (true);
create policy "supplier_parts_all" on public.supplier_parts
  for all to authenticated using (true) with check (true);

-- price_history: somente leitura para o app. Os registros são criados pelo
-- trigger log_price_change (security definer) e nunca editados ou apagados.
create policy "price_history_select" on public.price_history
  for select to authenticated using (true);

-- settings: leitura para todos, escrita só admin ------------------------------
create policy "settings_select" on public.settings
  for select to authenticated using (true);
create policy "settings_insert_admin" on public.settings
  for insert to authenticated with check (public.is_admin());
create policy "settings_update_admin" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "settings_delete_admin" on public.settings
  for delete to authenticated using (public.is_admin());

-- Privilégios explícitos (o RLS acima restringe o que cada papel realmente pode) ----
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.suppliers, public.categories, public.parts, public.supplier_parts, public.settings
to authenticated;
grant select on public.price_history to authenticated;
