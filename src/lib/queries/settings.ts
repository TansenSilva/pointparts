import { createClient } from "@/lib/supabase/client";
import { unwrap } from "./helpers";

/** Salva "preço desatualizado após N dias" (somente admin; o RLS bloqueia os demais). */
export async function saveStaleDays(days: number) {
  const rows = unwrap<{ id: string }[]>(
    await createClient()
      .from("settings")
      .upsert({ key: "stale_days", value: days, updated_at: new Date().toISOString() }, { onConflict: "key" })
      .select("id"),
  );
  if (rows.length === 0) throw { code: "42501", message: "Sem permissão" };
}
