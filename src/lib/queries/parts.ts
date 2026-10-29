import { createClient } from "@/lib/supabase/client";
import { PAGE_SIZE, type PartSort } from "@/lib/constants";
import type { FilterOptions, Part, PartSummary, SimilarPart } from "@/lib/types";
import type { OfferInput, PartInput } from "@/lib/validation";
import { unwrap } from "./helpers";

export interface PartSearchParams {
  q?: string;
  category?: string;
  brand?: string;
  model?: string;
  technology?: string;
  quality?: string;
  supplier?: string;
  availability?: string;
  active?: boolean | null;
  sort?: PartSort;
  page?: number;
  pageSize?: number;
}

/** Pesquisa/lista peças com melhor preço, filtros, ordenação e paginação (RPC search_parts). */
export async function searchParts(p: PartSearchParams = {}) {
  const pageSize = p.pageSize ?? PAGE_SIZE;
  const page = p.page ?? 1;
  const res = await createClient().rpc("search_parts", {
    p_query: p.q?.trim() || null,
    p_category: p.category || null,
    p_brand: p.brand || null,
    p_model: p.model || null,
    p_technology: p.technology || null,
    p_quality: p.quality || null,
    p_supplier: p.supplier || null,
    p_availability: p.availability || null,
    // Consultas de compra ocultam inativas; a gestão passa null para listar todas.
    p_active: p.active === undefined ? true : p.active,
    p_sort: p.sort ?? "name",
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  const rows = unwrap<PartSummary[]>(res).map((r) => ({
    ...r,
    // bigint chega como número no JSON do PostgREST; garantimos o tipo
    supplier_count: Number(r.supplier_count),
    in_stock_count: Number(r.in_stock_count),
    total_count: Number(r.total_count),
  }));
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export async function getFilterOptions() {
  const res = await createClient().rpc("part_filter_options");
  return unwrap<FilterOptions>(res);
}

export async function findSimilarParts(name: string, excludeId?: string) {
  const res = await createClient().rpc("find_similar_parts", {
    p_name: name,
    p_exclude: excludeId ?? null,
    p_limit: 5,
  });
  return unwrap<SimilarPart[]>(res);
}

export type PartWithCategory = Part & { category: { id: string; name: string } | null };

export async function getPart(id: string) {
  const res = await createClient()
    .from("parts")
    .select("*, category:categories(id, name)")
    .eq("id", id)
    .maybeSingle();
  return unwrap<PartWithCategory | null>(res);
}

export type NewOfferInput = Omit<OfferInput, "price"> & { price: number };

/** Cadastro rápido: peça + fornecedores/preços numa única transação. */
export async function createPartWithOffers(part: PartInput, offers: NewOfferInput[]) {
  const res = await createClient().rpc("create_part_with_offers", { p_part: part, p_offers: offers });
  return unwrap<string>(res);
}

export async function updatePart(id: string, input: PartInput) {
  const res = await createClient().from("parts").update(input).eq("id", id).select().single();
  return unwrap<Part>(res);
}

export async function deletePart(id: string) {
  unwrap<null>(await createClient().from("parts").delete().eq("id", id));
}
