"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Checkbox, FormField, Input, Textarea } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { friendlyError } from "@/lib/errors";
import { createSupplier, updateSupplier } from "@/lib/queries/suppliers";
import type { Supplier } from "@/lib/types";
import { supplierSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";

type FormState = {
  name: string;
  contact_name: string;
  whatsapp: string;
  phone: string;
  email: string;
  website: string;
  site_login: string;
  notes: string;
  active: boolean;
};

function initial(s?: Supplier): FormState {
  return {
    name: s?.name ?? "",
    contact_name: s?.contact_name ?? "",
    whatsapp: s?.whatsapp ?? "",
    phone: s?.phone ?? "",
    email: s?.email ?? "",
    website: s?.website ?? "",
    site_login: s?.site_login ?? "",
    notes: s?.notes ?? "",
    active: s?.active ?? true,
  };
}

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => initial(supplier));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: Exclude<keyof FormState, "active">) => ({
    id: key,
    value: form[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
    "aria-invalid": !!errors[key],
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = supplierSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const saved = supplier ? await updateSupplier(supplier.id, parsed.data) : await createSupplier(parsed.data);
      toast.success(supplier ? "Fornecedor atualizado" : "Fornecedor criado");
      router.push(`/fornecedores/${saved.id}`);
      router.refresh();
    } catch (err) {
      toast.error(friendlyError(err));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={supplier ? "Editar fornecedor" : "Novo fornecedor"} />
      <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Nome do fornecedor" htmlFor="name" required error={errors.name} className="md:col-span-2">
            <Input {...text("name")} autoFocus />
          </FormField>
          <FormField label="Nome do contato" htmlFor="contact_name" error={errors.contact_name}>
            <Input {...text("contact_name")} />
          </FormField>
          <FormField label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp} hint="Com DDD. Gera o botão de WhatsApp automaticamente.">
            <Input {...text("whatsapp")} type="tel" inputMode="tel" placeholder="(11) 91234-5678" />
          </FormField>
          <FormField label="Telefone" htmlFor="phone" error={errors.phone}>
            <Input {...text("phone")} type="tel" inputMode="tel" />
          </FormField>
          <FormField label="E-mail" htmlFor="email" error={errors.email}>
            <Input {...text("email")} type="email" inputMode="email" />
          </FormField>
          <FormField label="Site" htmlFor="website" error={errors.website}>
            <Input {...text("website")} inputMode="url" placeholder="https://" />
          </FormField>
          <FormField label="Usuário/login do site" htmlFor="site_login" error={errors.site_login} hint="Não guarde a senha aqui.">
            <Input {...text("site_login")} autoComplete="off" />
          </FormField>
          <FormField label="Observações" htmlFor="notes" error={errors.notes} className="md:col-span-2">
            <Textarea {...text("notes")} rows={3} />
          </FormField>
        </div>
        <Checkbox label="Fornecedor ativo" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <LinkButton href={supplier ? `/fornecedores/${supplier.id}` : "/fornecedores"} variant="secondary">
            Cancelar
          </LinkButton>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}
