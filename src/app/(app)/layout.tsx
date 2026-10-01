import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppProvider } from "@/components/layout/AppProvider";
import { AppShell } from "@/components/layout/AppShell";
import { DEFAULT_STALE_DAYS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: setting }] = await Promise.all([
    supabase.from("profiles").select("id, email, name, role").eq("id", user.id).maybeSingle(),
    supabase.from("settings").select("value").eq("key", "stale_days").maybeSingle(),
  ]);

  const days = Number(setting?.value);
  const staleDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_STALE_DAYS;
  const typedProfile = (profile as Profile | null) ?? null;

  return (
    <AppProvider value={{ profile: typedProfile, email: user.email ?? "", isAdmin: typedProfile?.role === "admin", staleDays }}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
