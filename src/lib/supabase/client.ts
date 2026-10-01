import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/** Cliente do navegador (usa apenas a chave anon; o acesso é protegido por RLS). */
export function createClient(): SupabaseClient {
  if (!client) {
    // As variáveis NEXT_PUBLIC_* precisam ser acessadas literalmente para o Next embuti-las no bundle.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error("Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.");
    }
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
