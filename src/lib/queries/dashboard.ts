import { createClient } from "@/lib/supabase/client";
import type { DashboardStats, SupplierPart } from "@/lib/types";
import { unwrap } from "./helpers";

export type ActivityRow = SupplierPart & {
  part: { id: string; name: string };
  supplier: { id: string; name: string };
};

const ACTIVITY_SELECT = "*, part:parts(id, name), supplier:suppliers(id, name)";

export async function getDashboardStats(staleDays: number) {
  const res = await createClient().rpc("dashboard_stats", { p_stale_days: staleDays });
  return unwrap<DashboardStats>(res);
}

export async function listRecentlyUpdated(limit = 8) {
  const res = await createClient()
    .from("supplier_parts")
    .select(ACTIVITY_SELECT)
    .order("checked_at", { ascending: false })
    .limit(limit);
  return unwrap<ActivityRow[]>(res);
}

export async function listStaleOffers(staleDays: number, limit = 8) {
  const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString();
  const res = await createClient()
    .from("supplier_parts")
    .select(ACTIVITY_SELECT)
    .lt("checked_at", cutoff)
    .order("checked_at", { ascending: true })
    .limit(limit);
  return unwrap<ActivityRow[]>(res);
}
