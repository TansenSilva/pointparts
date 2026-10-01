import { createClient } from "@/lib/supabase/client";
import { PAGE_SIZE } from "@/lib/constants";
import type { Supplier } from "@/lib/types";
import type { SupplierInput } from "@/lib/validation";
import { escapeLike, pageRange, unwrap } from "./helpers";

export type SupplierWithCount = Supplier & { supplier_parts: { count: number }[] };

export interface SupplierListParams {
  q: string;
  status: "all" | "active" | "inactive";
  page: number;
}

export async function listSuppliers({ q, status, page }: SupplierListParams) {
  const supabase = createClient();
  let query = supabase
    .from("suppliers")
    .select("*, supplier_parts(count)", { count: "exact" })
    .order("name", { ascending: true })
    .range(...pageRange(page, PAGE_SIZE));
  const term = escapeLike(q);
  if (term) {
    query = query.or(`name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  if (status !== "all") query = query.eq("active", status === "active");
  const res = await query;
  return { rows: unwrap<SupplierWithCount[]>(res), total: res.count ?? 0 };
}

/** Todos os fornecedores (id/nome/ativo) para selects e filtros. */
export async function listSupplierOptions() {
  const res = await createClient().from("suppliers").select("id, name, active").order("name");
  return unwrap<Pick<Supplier, "id" | "name" | "active">[]>(res);
}

export async function getSupplier(id: string) {
  const res = await createClient().from("suppliers").select("*").eq("id", id).maybeSingle();
  return unwrap<Supplier | null>(res);
}

export async function createSupplier(input: SupplierInput) {
  const res = await createClient().from("suppliers").insert(input).select().single();
  return unwrap<Supplier>(res);
}

export async function updateSupplier(id: string, input: SupplierInput) {
  const res = await createClient().from("suppliers").update(input).eq("id", id).select().single();
  return unwrap<Supplier>(res);
}

export async function deleteSupplier(id: string) {
  unwrap<null>(await createClient().from("suppliers").delete().eq("id", id));
}
