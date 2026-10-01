import { createClient } from "@/lib/supabase/client";
import { PAGE_SIZE } from "@/lib/constants";
import type { PriceHistoryRow } from "@/lib/types";
import { escapeLike, pageRange, unwrap } from "./helpers";

export interface HistoryParams {
  q?: string;
  partId?: string;
  supplierId?: string;
  page?: number;
  pageSize?: number;
}

export async function listPriceHistory({ q, partId, supplierId, page = 1, pageSize = PAGE_SIZE }: HistoryParams) {
  let query = createClient()
    .from("price_history_detailed")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...pageRange(page, pageSize));
  if (partId) query = query.eq("part_id", partId);
  if (supplierId) query = query.eq("supplier_id", supplierId);
  const term = escapeLike(q ?? "");
  if (term) query = query.or(`part_name.ilike.%${term}%,supplier_name.ilike.%${term}%`);
  const res = await query;
  return { rows: unwrap<PriceHistoryRow[]>(res), total: res.count ?? 0 };
}
