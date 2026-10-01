-- =============================================================================
-- PointParts — dados de exemplo (opcional)
-- Pode ser executado várias vezes: se os dados de exemplo já existirem, nada é feito.
-- =============================================================================
do $$
declare
  c_tela uuid; c_bat uuid; c_con uuid;
  s_alfa uuid; s_beta uuid; s_gama uuid; s_delta uuid; s_eps uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid; p7 uuid;
begin
  if exists (select 1 from public.suppliers where name = 'Fornecedor Alfa') then
    raise notice 'Dados de exemplo já existem — nada a fazer.';
    return;
  end if;

  select id into c_tela from public.categories where name = 'Tela';
  select id into c_bat  from public.categories where name = 'Bateria';
  select id into c_con  from public.categories where name = 'Conector de carga';

  insert into public.suppliers (name, contact_name, whatsapp, phone, email, website, site_login, notes) values
    ('Fornecedor Alfa',  'Carlos',  '11 91234-0001', '(11) 3000-0001', 'vendas@alfa.example',  'https://alfa.example',  'assistencia', 'Entrega em 1 dia útil.')
    returning id into s_alfa;
  insert into public.suppliers (name, contact_name, whatsapp, website, notes) values
    ('Fornecedor Beta',  'Marina',  '11 91234-0002', 'https://beta.example', 'Pedido mínimo R$ 200.')
    returning id into s_beta;
  insert into public.suppliers (name, contact_name, whatsapp, email) values
    ('Fornecedor Gama',  'Roberto', '21 91234-0003', 'contato@gama.example')
    returning id into s_gama;
  insert into public.suppliers (name, contact_name, whatsapp, website) values
    ('Fornecedor Delta', 'Ana',     '31 91234-0004', 'https://delta.example')
    returning id into s_delta;
  insert into public.suppliers (name, contact_name, phone, active, notes) values
    ('Fornecedor Épsilon', 'Paulo', '(11) 3000-0005', false, 'Inativo — sem retorno há meses.')
    returning id into s_eps;

  insert into public.parts (name, category_id, brand, device_model, technology, quality, internal_code)
    values ('Tela Soft OLED iPhone 15', c_tela, 'Apple', 'iPhone 15', 'Soft OLED', 'Premium', 'TL-IP15-SO') returning id into p1;
  insert into public.parts (name, category_id, brand, device_model, technology, quality, internal_code)
    values ('Tela Incell iPhone 15', c_tela, 'Apple', 'iPhone 15', 'Incell', 'Standard', 'TL-IP15-IN') returning id into p2;
  insert into public.parts (name, category_id, brand, device_model, technology, quality)
    values ('Tela OLED iPhone 15 Pro', c_tela, 'Apple', 'iPhone 15 Pro', 'OLED', 'Premium') returning id into p3;
  insert into public.parts (name, category_id, brand, device_model, quality)
    values ('Bateria iPhone 13', c_bat, 'Apple', 'iPhone 13', 'Original') returning id into p4;
  insert into public.parts (name, category_id, brand, device_model, technology, quality)
    values ('Tela Incell iPhone 11', c_tela, 'Apple', 'iPhone 11', 'Incell', 'Standard') returning id into p5;
  insert into public.parts (name, category_id, brand, device_model, quality, manufacturer_code)
    values ('Conector de carga Galaxy A54', c_con, 'Samsung', 'Galaxy A54', 'Original', 'GH96-15xxx') returning id into p6;
  insert into public.parts (name, category_id, brand, device_model, technology, quality)
    values ('Tela OLED Galaxy S23', c_tela, 'Samsung', 'Galaxy S23', 'OLED', 'Premium') returning id into p7;

  -- Ofertas (preço, disponibilidade, última consulta)
  insert into public.supplier_parts (part_id, supplier_id, price, availability, supplier_code, product_url, checked_at) values
    (p1, s_alfa,  380, 'in_stock',     'ALF-1501', 'https://alfa.example/tela-soft-oled-iphone-15', now() - interval '1 day'),
    (p1, s_beta,  345, 'in_stock',     'BT-IP15-SO', 'https://beta.example/p/ip15-soft-oled',       now() - interval '2 hours'),
    (p1, s_gama,  410, 'out_of_stock', null,         null,                                          now() - interval '5 days'),
    (p1, s_delta, 355, 'in_stock',     null,         'https://delta.example/ip15-soft',             now() - interval '1 day'),
    (p2, s_alfa,  195, 'in_stock',     null, null, now() - interval '3 days'),
    (p2, s_beta,  190, 'in_stock',     null, null, now() - interval '1 day'),
    (p2, s_delta, 210, 'on_request',   null, null, now() - interval '20 days'),
    (p3, s_beta,  470, 'in_stock',     null, null, now() - interval '1 day'),
    (p3, s_gama,  520, 'in_stock',     null, null, now() - interval '30 days'),
    (p4, s_alfa,   95, 'in_stock',     null, null, now() - interval '4 days'),
    (p4, s_delta,  88, 'in_stock',     null, null, now() - interval '2 days'),
    (p5, s_beta,  120, 'in_stock',     null, null, now() - interval '6 days'),
    (p5, s_gama,  115, 'out_of_stock', null, null, now() - interval '12 days'),
    (p6, s_alfa,   42, 'in_stock',     null, null, now() - interval '1 day'),
    (p6, s_delta,  39, 'unknown',      null, null, now() - interval '8 days'),
    (p7, s_alfa,  640, 'in_stock',     null, null, now() - interval '2 days'),
    (p7, s_beta,  610, 'on_request',   null, null, now() - interval '17 days');

  -- Histórico de exemplo: substitui os registros iniciais por uma linha do tempo realista
  delete from public.price_history where part_id in (p1, p2, p3, p4, p5, p6, p7);
  insert into public.price_history (supplier_part_id, part_id, supplier_id, old_price, new_price, created_at)
  select sp.id, sp.part_id, sp.supplier_id, h.old_price, h.new_price, now() - h.ago
  from public.supplier_parts sp
  join (values
    (p1, s_beta,  null::numeric, 380::numeric, interval '30 days'),
    (p1, s_beta,  380::numeric,  360::numeric, interval '12 days'),
    (p1, s_beta,  360::numeric,  345::numeric, interval '2 hours'),
    (p1, s_alfa,  null::numeric, 395::numeric, interval '30 days'),
    (p1, s_alfa,  395::numeric,  380::numeric, interval '1 day'),
    (p1, s_gama,  null::numeric, 410::numeric, interval '30 days'),
    (p1, s_delta, null::numeric, 355::numeric, interval '30 days'),
    (p2, s_beta,  null::numeric, 200::numeric, interval '25 days'),
    (p2, s_beta,  200::numeric,  190::numeric, interval '1 day')
  ) as h(part_id, supplier_id, old_price, new_price, ago)
    on h.part_id = sp.part_id and h.supplier_id = sp.supplier_id;
end $$;
