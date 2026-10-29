import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const db = new PGlite({ extensions: { pg_trgm, unaccent } });
const read = (path: string) => readFileSync(path, "utf8");
const userId = "00000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  // Apenas Auth é substituído: tabelas, funções, RLS e triggers são as migrations reais.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema extensions;
    create schema auth;
    grant usage on schema public, auth, extensions to anon, authenticated;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(read(`supabase/migrations/${file}`));
  }
  await db.exec(`insert into auth.users (id, email) values ('${userId}', 'admin@example.test');`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
});

beforeEach(async () => {
  await db.exec("reset role; truncate public.parts, public.suppliers cascade; truncate pointparts_private.seed_records;");
});
afterAll(async () => { await db.close(); });

async function id(sql: string, params: unknown[] = []) {
  return (await db.query<{ id: string }>(sql, params)).rows[0].id;
}

async function part(name = "Tela teste", active = true) {
  return id("insert into public.parts(name, category_id, active) select $1, id, $2 from public.categories where name = 'Tela' returning id", [name, active]);
}

async function supplier(name: string) {
  return id("insert into public.suppliers(name) values ($1) returning id", [name]);
}

async function offer(partId: string, supplierId: string, price: number, availability: string, checkedAt: string) {
  return id(`insert into public.supplier_parts(part_id, supplier_id, price, availability, checked_at)
    values ($1,$2,$3,$4,$5) returning id`, [partId, supplierId, price, availability, checkedAt]);
}

interface SearchRow {
  id: string;
  best_price: string;
  best_supplier_id: string;
  best_availability: string;
  best_checked_at: Date;
  last_checked_at: Date;
  supplier_count: number;
}

async function search(args = "", params: unknown[] = []) {
  await db.exec("set role authenticated");
  try {
    return (await db.query<SearchRow>(`select * from public.search_parts(${args})`, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

describe("pesquisa real no PostgreSQL", () => {
  it("combina fornecedor e estoque na mesma oferta", async () => {
    const p = await part();
    const a = await supplier("A");
    const b = await supplier("B");
    await offer(p, a, 90, "out_of_stock", "2026-10-01T12:00:00Z");
    await offer(p, b, 100, "in_stock", "2026-10-20T12:00:00Z");
    expect(await search("p_supplier => $1, p_availability => 'in_stock'", [a])).toEqual([]);
    const rows = await search("p_supplier => $1", [a]);
    expect(rows[0].best_supplier_id).toBe(a);
    expect(Number(rows[0].best_price)).toBe(90);
    expect(Number(rows[0].supplier_count)).toBe(1);
  });

  it("o filtro de disponibilidade também restringe o preço escolhido", async () => {
    const p = await part();
    await offer(p, await supplier("A"), 90, "out_of_stock", "2026-10-01T12:00:00Z");
    await offer(p, await supplier("B"), 100, "in_stock", "2026-10-20T12:00:00Z");
    const rows = await search("p_availability => 'out_of_stock'");
    expect(rows[0].best_availability).toBe("out_of_stock");
    expect(Number(rows[0].best_price)).toBe(90);
  });

  it("retorna a data da melhor oferta, distinta da última consulta geral", async () => {
    const p = await part();
    await offer(p, await supplier("Barato"), 90, "in_stock", "2026-10-01T12:00:00Z");
    await offer(p, await supplier("Recente"), 100, "in_stock", "2026-10-20T12:00:00Z");
    const [row] = await search();
    expect(new Date(row.best_checked_at).toISOString()).toBe("2026-10-01T12:00:00.000Z");
    expect(new Date(row.last_checked_at).toISOString()).toBe("2026-10-20T12:00:00.000Z");
  });

  it("oculta inativas por padrão, mantendo os filtros da gestão", async () => {
    const active = await part("Ativa");
    const inactive = await part("Inativa", false);
    expect((await search()).map((r) => r.id)).toEqual([active]);
    expect(await search("p_active => null")).toHaveLength(2);
    expect((await search("p_active => false")).map((r) => r.id)).toEqual([inactive]);
  });

  it("mantém pesquisa por acento, ordem das palavras e códigos", async () => {
    const p = await part("Tela Câmera iPhone 15");
    const sp = await offer(p, await supplier("A"), 90, "in_stock", "2026-10-01T12:00:00Z");
    await db.query("update public.supplier_parts set supplier_code = 'ABC-123' where id = $1", [sp]);
    expect((await search("p_query => '15 camera'")).map((r) => r.id)).toEqual([p]);
    expect((await search("p_query => 'abc 123'")).map((r) => r.id)).toEqual([p]);
  });

  it("não concede a anon execução da pesquisa nem acesso ao registro privado", async () => {
    await db.exec("set role anon");
    await expect(db.query("select * from public.search_parts()")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from pointparts_private.seed_records")).rejects.toThrow(/permission denied/);
    await db.exec("reset role; set role authenticated");
    await expect(db.query("select * from pointparts_private.seed_records")).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
});

describe("limpeza segura de demonstração", () => {
  it("preserva peça real com nome de exemplo e seu histórico", async () => {
    const p = await part("Tela Soft OLED iPhone 15");
    await offer(p, await supplier("Real"), 250, "in_stock", "2026-10-01T12:00:00Z");
    await db.exec(read("supabase/seed.sql"));
    await db.exec(read("supabase/cleanup-seed.sql"));
    expect((await db.query("select id from public.parts")).rows).toEqual([{ id: p }]);
    expect((await db.query("select * from public.price_history")).rows).toHaveLength(1);
  });

  it("remove exemplos intactos e pode rodar de novo", async () => {
    await db.exec(read("supabase/seed.sql"));
    await db.exec(read("supabase/seed.sql"));
    await db.exec(read("supabase/cleanup-seed.sql"));
    await db.exec(read("supabase/cleanup-seed.sql"));
    expect((await db.query("select * from public.parts")).rows).toHaveLength(0);
    expect((await db.query("select * from public.suppliers")).rows).toHaveLength(0);
  });

  it("preserva exemplos legados sem identificação explícita", async () => {
    await db.exec(read("supabase/seed.sql"));
    // Simula uma instalação cujo seed foi executado antes da nova migration.
    await db.exec("truncate pointparts_private.seed_records");
    await db.exec(read("supabase/cleanup-seed.sql"));
    expect((await db.query("select * from public.parts")).rows).toHaveLength(7);
    expect((await db.query("select * from public.suppliers")).rows).toHaveLength(5);
  });

  it("preserva peças cujo preço de exemplo passou a ser usado/alterado", async () => {
    await db.exec(read("supabase/seed.sql"));
    await db.exec("update public.supplier_parts set price = 999 where part_id in (select id from public.parts where name = 'Tela Soft OLED iPhone 15')");
    await db.exec(read("supabase/cleanup-seed.sql"));
    expect((await db.query("select name from public.parts")).rows).toEqual([{ name: "Tela Soft OLED iPhone 15" }]);
    expect((await db.query("select * from public.supplier_parts")).rows).toHaveLength(4);
  });

  it("preserva exemplos editados e fornecedores ligados a cadastros reais", async () => {
    await db.exec(read("supabase/seed.sql"));
    const realPart = await part("Peça real");
    const alfa = (await db.query<{ id: string }>("select id from public.suppliers where name = 'Fornecedor Alfa'")).rows[0].id;
    await offer(realPart, alfa, 200, "in_stock", "2026-10-20T12:00:00Z");
    await db.exec("update public.parts set notes = 'Cadastro em uso' where name = 'Bateria iPhone 13'");
    await db.exec(read("supabase/cleanup-seed.sql"));
    const parts = (await db.query<{ name: string }>("select name from public.parts order by name")).rows.map((p) => p.name);
    expect(parts).toEqual(["Bateria iPhone 13", "Peça real"]);
    expect((await db.query("select id from public.suppliers where id = $1", [alfa])).rows).toHaveLength(1);
  });
});

describe("SQL produzido pelo importador Python", () => {
  const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");
  function importSql(price: number, date: string) {
    return execFileSync(python, ["-c", `
import json, sys
from scripts.gerar_importacao import build_sql
r = json.loads(sys.argv[1])
print(build_sql([r], r['date'], [r['supplier']])[0])
`, JSON.stringify({ name: "Tela importada", brand: null, tech: null, quality: null, supplier: "Fornecedor importado", price, date })], { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  }

  it("ignora listas antigas, preserva histórico e aceita listas mais recentes", async () => {
    await db.exec(importSql(100, "2026-10-20"));
    await db.exec(importSql(80, "2026-09-01"));
    let rows = (await db.query<{ price: string }>("select price from public.supplier_parts")).rows;
    expect(Number(rows[0].price)).toBe(100);
    expect((await db.query("select * from public.price_history")).rows).toHaveLength(1);
    await db.exec(importSql(120, "2026-10-21"));
    rows = (await db.query<{ price: string }>("select price from public.supplier_parts")).rows;
    expect(Number(rows[0].price)).toBe(120);
    expect((await db.query("select * from public.price_history")).rows).toHaveLength(2);
    await db.exec(importSql(120, "2026-10-21"));
    expect((await db.query("select * from public.price_history")).rows).toHaveLength(2);
  });

  it("preserva consulta manual posterior ao meio-dia da mesma lista", async () => {
    await db.exec(importSql(100, "2026-10-20"));
    await db.exec("update public.supplier_parts set price = 150, checked_at = '2026-10-20T18:00:00-03'");
    await db.exec(importSql(100, "2026-10-20"));
    const [row] = (await db.query<{ price: string; checked_at: Date }>("select price, checked_at from public.supplier_parts")).rows;
    expect(Number(row.price)).toBe(150);
    expect(new Date(row.checked_at).toISOString()).toBe("2026-10-20T21:00:00.000Z");
    expect((await db.query("select * from public.price_history")).rows).toHaveLength(2);
  });
});
