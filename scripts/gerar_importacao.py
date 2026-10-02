#!/usr/bin/env python3
"""
Gera um script SQL (para colar no SQL Editor do Supabase) que cadastra peças e preços
a partir de listas de fornecedores em Excel.

Uso:
  python3 scripts/gerar_importacao.py LISTA.xlsx --data 2026-09-30 --saida imports/lista.sql

Lista "Vibe / Marítimo" (uma aba, 3 colunas de modelos com preço ao lado):
  - nome em vermelho (ou com "VIBE" no nome) -> fornecedor Vibe
  - nome em preto                           -> fornecedor Marítimo
  - itens sem preço são ignorados.
Peças com o mesmo nome (sem a palavra VIBE, sem acentos/pontuação) viram UMA peça com um preço por fornecedor.
O script é reexecutável: preços diferentes atualizam a oferta (e geram histórico).
"""
import argparse, re, sys, unicodedata
from collections import defaultdict
import openpyxl

BRANDS = {
    "SAMSUNG": "Samsung", "SANSUNG": "Samsung", "IPHONE": "Apple", "MOTOROLA": "Motorola", "LG": "LG",
    "XIAOME": "Xiaomi", "XIAOMI": "Xiaomi", "NOKIA": "Nokia", "INFINIX": "Infinix", "REALME": "Realme",
    "OPPO": "Oppo", "ITEL": "Itel", "HUAWEI": "Huawei", "ASUS": "Asus", "ZENFONE": "Asus",
}
NO_BRAND_SECTIONS = {"TOUCH", "LCD", "TABLET"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def clean_name(raw: str) -> str:
    s = re.sub(r"\bVIBE\b", " ", str(raw).upper())
    s = re.sub(r"\bINCEL\b", "INCELL", s).replace("C0RE", "CORE")
    return re.sub(r"\s+", " ", s).strip()


def display_name(name: str, brand: str | None) -> str:
    """"Tela " + marca (se o nome ainda não a traz) + nome da lista."""
    if brand == "Apple":
        rest = name[len("IPHONE"):].strip() if name.startswith("IPHONE") else name
        return f"Tela iPhone {rest}"
    if brand and not name.startswith(brand.upper()):
        return f"Tela {brand} {name}"
    return f"Tela {name}"


def technology(name: str) -> str | None:
    n = f" {name} "
    if " SOFT OLED " in n or " SOFT " in n and "OLED" in n:
        return "Soft OLED"
    for key, label in ((" OLED ", "OLED"), (" INCELL ", "Incell"), (" LCD ", "LCD"), (" AMOLED ", "AMOLED")):
        if key in n:
            return label
    return None


def quality(name: str) -> str | None:
    return "Original" if re.search(r"\b(ORI|ORIGINAL)\b", name) else None


def is_red(cell) -> bool:
    c = cell.font.color
    return c is not None and c.type == "rgb" and str(c.rgb).upper().endswith("FF0000")


def parse_vibe_maritimo(path: str):
    ws = openpyxl.load_workbook(path).active
    current = {1: "SAMSUNG", 4: "IPHONE", 7: "MOTOROLA"}  # coluna do nome -> seção atual
    rows, ignored = [], 0
    for row in ws.iter_rows(min_row=2):
        for ci in (1, 4, 7):
            cell, price = row[ci], row[ci + 1].value
            if cell.value is None or not str(cell.value).strip():
                continue
            raw = str(cell.value).strip()
            if isinstance(price, str) and price.strip().upper().startswith("PRE"):
                current[ci] = raw.upper()          # cabeçalho de seção (LG, XIAOME, ...)
                continue
            if price is None and raw.upper() in BRANDS:
                current[ci] = raw.upper()          # sub-cabeçalho sem preço (OPPO, ITEL)
                continue
            if not isinstance(price, (int, float)) or isinstance(price, bool) or price <= 0:
                ignored += 1
                continue
            section = current[ci]
            brand = None if section in NO_BRAND_SECTIONS else BRANDS.get(section)
            supplier = "Vibe" if (is_red(cell) or re.search(r"\bVIBE\b", raw.upper())) else "Marítimo"
            name = clean_name(raw)
            rows.append({"name": display_name(name, brand), "brand": brand, "tech": technology(name),
                         "quality": quality(name), "supplier": supplier, "price": float(price),
                         "src": f"linha {cell.row}"})
    return rows, ignored


def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


def build_sql(rows, date: str, suppliers: list[str]):
    # um preço por (peça, fornecedor): em duplicidade, vale o menor
    best, dup = {}, []
    for r in rows:
        k = (norm(r["name"]), r["supplier"])
        if k in best:
            dup.append((best[k], r))
            if r["price"] < best[k]["price"]:
                best[k] = r
        else:
            best[k] = r
    final = list(best.values())
    values = ",\n".join(
        f"  ({q(r['name'])}, {q(r['brand'])}, {q(r['tech'])}, {q(r['quality'])}, {q(r['supplier'])}, {r['price']:.2f})"
        for r in final)
    sup_values = ", ".join(f"({q(s)})" for s in suppliers)
    sql = f"""-- =============================================================================
-- PointParts — importação de lista de preços ({date})
-- Fornecedores: {', '.join(suppliers)} | Ofertas: {len(final)} | Peças distintas: {len({norm(r['name']) for r in final})}
-- Cole no SQL Editor do Supabase e clique em Run. Pode ser executado de novo:
-- peças já existentes são reaproveitadas e preços diferentes atualizam a oferta (e geram histórico).
-- =============================================================================
begin;

create temp table _imp (
  name text, brand text, technology text, quality text, supplier text, price numeric(12,2)
) on commit drop;

insert into _imp (name, brand, technology, quality, supplier, price) values
{values};

-- fornecedores
insert into public.suppliers (name)
select v.n from (values {sup_values}) as v(n)
where not exists (select 1 from public.suppliers s where lower(s.name) = lower(v.n));

-- peças novas (categoria "Tela"); as que já existem (mesmo nome, sem acento/pontuação) são reaproveitadas
insert into public.parts (name, category_id, brand, technology, quality)
select distinct on (public.norm_text(i.name))
       i.name, (select id from public.categories where name = 'Tela'), i.brand, i.technology, i.quality
from _imp i
where not exists (select 1 from public.parts p where public.norm_text(p.name) = public.norm_text(i.name))
order by public.norm_text(i.name);

-- ofertas (um preço por fornecedor); data da consulta = data da lista
insert into public.supplier_parts (part_id, supplier_id, price, availability, checked_at)
select p.id, s.id, i.price, 'in_stock', timestamptz '{date} 12:00:00-03'
from _imp i
join public.suppliers s on lower(s.name) = lower(i.supplier)
join lateral (select id from public.parts where public.norm_text(name) = public.norm_text(i.name) order by created_at limit 1) p on true
on conflict (part_id, supplier_id) do update
  set price = excluded.price, availability = excluded.availability, checked_at = excluded.checked_at;

commit;

select (select count(*) from public.parts)          as total_pecas,
       (select count(*) from public.supplier_parts) as total_ofertas,
       (select count(*) from public.suppliers)      as total_fornecedores;
"""
    return sql, final, dup


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx")
    ap.add_argument("--data", required=True, help="data da lista, AAAA-MM-DD")
    ap.add_argument("--saida", required=True)
    a = ap.parse_args()
    rows, ignored = parse_vibe_maritimo(a.xlsx)
    sql, final, dup = build_sql(rows, a.data, ["Vibe", "Marítimo"])
    open(a.saida, "w", encoding="utf-8").write(sql)
    by = defaultdict(set)
    for r in final:
        by[norm(r["name"])].add(r["supplier"])
    both = sum(1 for s in by.values() if len(s) > 1)
    print(f"ofertas: {len(final)} | peças: {len(by)} | em ambos os fornecedores: {both} | sem preço (ignorados): {ignored}")
    for s in ("Vibe", "Marítimo"):
        print(f"  {s}: {sum(1 for r in final if r['supplier'] == s)} ofertas")
    for old, new in dup:
        print(f"  duplicado ({new['name']} / {new['supplier']}): {old['price']} x {new['price']} -> vale o menor")


if __name__ == "__main__":
    main()
