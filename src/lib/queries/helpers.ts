import type { PostgrestError } from "@supabase/supabase-js";

/** Lança o erro do Supabase (se houver) e devolve os dados tipados. */
export function unwrap<T>(res: { data: unknown; error: PostgrestError | null }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

export function escapeLike(term: string): string {
  return term.replace(/[\\%_,()]/g, " ").trim();
}

export function pageRange(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}
