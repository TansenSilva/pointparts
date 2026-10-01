import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/** Cliente para Server Components / Route Handlers (sessão via cookies). */
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Variáveis do Supabase não configuradas.");
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}
