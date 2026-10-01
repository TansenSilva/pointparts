import { createClient } from "@/lib/supabase/client";
import { PAGE_SIZE } from "@/lib/constants";
import type { Availability, Offer, SupplierPart } from "@/lib/types";
import type { OfferInput } from "@/lib/validation";
import { escapeLike, pageRange, unwrap } from "./helpers";

const OFFER_SELECT = "*, supplier:suppliers(id, name, whatsapp, website, active)";

/** Ofertas (com dados do fornecedor) de várias peças de uma vez. */
export async function listOffersForParts(partIds: string[]) {
  if (partIds.length === 0) return {} as Record<string, Offer[]>;
  const res = await createClient().from("supplier_parts").select(OFFER_SELECT).in("part_id", partIds);
  const grouped: Record<string, Offer[]> = {};
  for (const offer of unwrap<Offer[]>(res)) (grouped[offer.part_id] ??= []).push(offer);
  return grouped;
}

export async function listOffersForPart(partId: string) {
  return (await listOffersForParts([partId]))[partId] ?? [];
}

export type SupplierCatalogRow = SupplierPart & {
  parts: { id: string; name: string; device_model: string | null; category: { name: string } | null };
};

/** Catálogo de um fornecedor (peças vinculadas), paginado e com busca por nome da peça. */
export async function listOffersForSupplier(supplierId: string, q: string, page: number) {
  let query = createClient()
    .from("supplier_parts")
    .select("*, parts!inner(id, name, device_model, category:categories(name))", { count: "exact" })
    .eq("supplier_id", supplierId)
    .order("checked_at", { ascending: false })
    .range(...pageRange(page, PAGE_SIZE));
  const term = escapeLike(q);
  if (term) query = query.ilike("parts.name", `%${term}%`);
  const res = await query;
  return { rows: unwrap<SupplierCatalogRow[]>(res), total: res.count ?? 0 };
}

export async function addOffer(partId: string, input: OfferInput) {
  const res = await createClient()
    .from("supplier_parts")
    .insert({ ...input, part_id: partId, checked_at: new Date().toISOString() })
    .select(OFFER_SELECT)
    .single();
  return unwrap<Offer>(res);
}

/** Edição completa de um vínculo (preço, estoque, código, link, observação). */
export async function updateOffer(id: string, input: Omit<OfferInput, "supplier_id">) {
  const res = await createClient()
    .from("supplier_parts")
    .update({ ...input, checked_at: new Date().toISOString() })
    .eq("id", id)
    .select(OFFER_SELECT)
    .single();
  return unwrap<Offer>(res);
}

/** Edição rápida: preço + disponibilidade; registra a data/hora da atualização. */
export async function quickUpdateOffer(id: string, patch: { price: number; availability: Availability }) {
  const res = await createClient()
    .from("supplier_parts")
    .update({ ...patch, checked_at: new Date().toISOString() })
    .eq("id", id)
    .select(OFFER_SELECT)
    .single();
  return unwrap<Offer>(res);
}

/** "Preço continua o mesmo": só atualiza a data da consulta. */
export async function confirmOffer(id: string) {
  const res = await createClient()
    .from("supplier_parts")
    .update({ checked_at: new Date().toISOString() })
    .eq("id", id)
    .select(OFFER_SELECT)
    .single();
  return unwrap<Offer>(res);
}

export async function deleteOffer(id: string) {
  unwrap<null>(await createClient().from("supplier_parts").delete().eq("id", id));
}
