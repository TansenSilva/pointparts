"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField, Input } from "@/components/FormField";
import { useApp } from "@/components/layout/AppProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { friendlyError } from "@/lib/errors";
import { saveStaleDays } from "@/lib/queries/settings";
import { staleDaysSchema } from "@/lib/validation";
import { CategoriesManager } from "./CategoriesManager";

export function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { staleDays, isAdmin, profile, email } = useApp();
  const [days, setDays] = useState(String(staleDays));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const parsed = staleDaysSchema.safeParse(days);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    setError(undefined);
    setSaving(true);
    try {
      await saveStaleDays(parsed.data);
      toast.success("Configuração salva");
      router.refresh(); // recarrega o valor global lido no layout
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Configurações" />

      <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <h2 className="text-base font-semibold">Preços desatualizados</h2>
        <form onSubmit={handleSave} noValidate className="mt-3 flex flex-wrap items-end gap-3">
          <FormField label="Considerar preço desatualizado após" htmlFor="stale" error={error} hint={isAdmin ? undefined : "Somente administradores podem alterar."}>
            <div className="flex items-center gap-2">
              <Input id="stale" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} disabled={!isAdmin} className="w-24" />
              <span className="text-sm text-slate-600">dias</span>
            </div>
          </FormField>
          {isAdmin && (
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          )}
        </form>
      </section>

      <CategoriesManager />

      <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <h2 className="text-base font-semibold">Conta</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">E-mail</dt>
          <dd>{email}</dd>
          <dt className="text-slate-500">Papel</dt>
          <dd>{isAdmin ? "Administrador" : "Usuário"}</dd>
          {profile?.name && (
            <>
              <dt className="text-slate-500">Nome</dt>
              <dd>{profile.name}</dd>
            </>
          )}
        </dl>
      </section>
    </div>
  );
}
