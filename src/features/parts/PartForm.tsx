"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Checkbox, FormField, Input, Select, Textarea } from "@/components/FormField";
import { PageHeader } from "@/components/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { QUALITY_SUGGESTIONS, TECHNOLOGY_SUGGESTIONS } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useQuery } from "@/lib/hooks/use-query";
import { buildPartName } from "@/lib/part-name";
import { listCategories } from "@/lib/queries/categories";
import { createPartWithOffers, findSimilarParts, getFilterOptions, updatePart, type PartWithCategory } from "@/lib/queries/parts";
import { listSupplierOptions } from "@/lib/queries/suppliers";
import { offerSchema, partSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { newOfferDraft, OffersEditor, type OfferDraft } from "./OffersEditor";

interface FormState {
  name: string;
  category_id: string;
  brand: string;
  device_model: string;
  technology: string;
  quality: string;
  internal_code: string;
  manufacturer_code: string;
  notes: string;
  active: boolean;
}

function initial(p?: PartWithCategory): FormState {
  return {
    name: p?.name ?? "",
    category_id: p?.category_id ?? "",
    brand: p?.brand ?? "",
    device_model: p?.device_model ?? "",
    technology: p?.technology ?? "",
    quality: p?.quality ?? "",
    internal_code: p?.internal_code ?? "",
    manufacturer_code: p?.manufacturer_code ?? "",
    notes: p?.notes ?? "",
    active: p?.active ?? true,
  };
}

/** Cadastro rápido (com fornecedores) quando `part` não é informado; edição caso contrário. */
export function PartForm({ part }: { part?: PartWithCategory }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(() => initial(part));
  // O nome é sugerido automaticamente até o usuário editá-lo manualmente.
  const [nameTouched, setNameTouched] = useState(!!part);
  const [offers, setOffers] = useState<OfferDraft[]>(() => (part ? [] : [newOfferDraft(), newOfferDraft()]));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [offerErrors, setOfferErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [similarAck, setSimilarAck] = useState(false);
  const [askSimilar, setAskSimilar] = useState(false);

  const categories = useQuery(listCategories, []);
  const suppliers = useQuery(listSupplierOptions, []);
  const options = useQuery(getFilterOptions, []);

  const debouncedName = useDebounce(form.name.trim(), 500);
  const similar = useQuery(() => findSimilarParts(debouncedName, part?.id), [debouncedName], debouncedName.length >= 3);
  const similarParts = debouncedName.length >= 3 ? (similar.data ?? []) : [];

  const autoName = (f: FormState) =>
    buildPartName({
      category: categories.data?.find((c) => c.id === f.category_id)?.name,
      technology: f.technology,
      model: f.device_model,
    });

  function update(patch: Partial<FormState>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (!nameTouched) next.name = autoName(next);
      return next;
    });
  }

  const field = (key: Exclude<keyof FormState, "active">) => ({
    id: key,
    value: form[key],
    "aria-invalid": !!errors[key],
    onChange: (e: { target: { value: string } }) => update({ [key]: e.target.value }),
  });

  async function submit(skipSimilarCheck: boolean) {
    const parsed = partSchema.safeParse(form);
    const fieldErrors: FieldErrors = parsed.success ? {} : toFieldErrors(parsed.error);

    // Linhas de fornecedor: ignora as totalmente vazias, valida as demais.
    const offerErrs: Record<number, string> = {};
    const validOffers: NonNullable<ReturnType<typeof offerSchema.safeParse>["data"]>[] = [];
    const seen = new Set<string>();
    for (const row of offers) {
      if (!row.supplier_id && !row.price.trim()) continue;
      const res = offerSchema.safeParse({ ...row, supplier_code: "", product_url: "", notes: "" });
      if (!res.success) {
        offerErrs[row.key] = res.error.issues[0]?.message ?? "Dados inválidos";
      } else if (seen.has(res.data.supplier_id)) {
        offerErrs[row.key] = "Fornecedor repetido";
      } else {
        seen.add(res.data.supplier_id);
        validOffers.push(res.data);
      }
    }
    setErrors(fieldErrors);
    setOfferErrors(offerErrs);
    if (!parsed.success || Object.keys(offerErrs).length > 0) return;

    if (!part && !skipSimilarCheck && !similarAck && similarParts.length > 0) {
      setAskSimilar(true);
      return;
    }

    setSaving(true);
    try {
      if (part) {
        await updatePart(part.id, parsed.data);
        toast.success("Peça atualizada");
        router.push(`/pecas/${part.id}`);
      } else {
        const id = await createPartWithOffers(parsed.data, validOffers);
        toast.success("Peça cadastrada");
        router.push(`/pecas/${id}`);
      }
      router.refresh();
    } catch (err) {
      toast.error(friendlyError(err));
      setSaving(false);
    }
  }

  const listId = (name: string) => `${name}-list`;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={part ? "Editar peça" : "Nova peça"} description={part ? undefined : "Cadastre a peça e já informe os preços dos fornecedores."} />
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void submit(false);
        }}
        noValidate
        className="space-y-5"
      >
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Categoria" htmlFor="category_id" required error={errors.category_id} hint="Novas categorias em Configurações.">
              <Select {...field("category_id")} autoFocus>
                <option value="">Selecione...</option>
                {categories.data?.filter((c) => c.active || c.id === form.category_id).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Marca" htmlFor="brand" error={errors.brand}>
              <Input {...field("brand")} list={listId("brand")} placeholder="Apple, Samsung..." />
            </FormField>
            <FormField label="Modelo do aparelho" htmlFor="device_model" error={errors.device_model}>
              <Input {...field("device_model")} list={listId("model")} placeholder="iPhone 15" />
            </FormField>
            <FormField label="Tipo/tecnologia" htmlFor="technology" error={errors.technology}>
              <Input {...field("technology")} list={listId("tech")} placeholder="Soft OLED, Incell..." />
            </FormField>
            <FormField label="Qualidade" htmlFor="quality" error={errors.quality}>
              <Input {...field("quality")} list={listId("quality")} placeholder="Premium, Original..." />
            </FormField>
            <FormField
              label="Nome exibido"
              htmlFor="name"
              required
              error={errors.name}
              hint={nameTouched ? "Nome editado manualmente." : "Montado automaticamente (categoria + tipo + modelo). Pode editar."}
            >
              <Input
                {...field("name")}
                onChange={(e) => {
                  setNameTouched(true);
                  setForm((f) => ({ ...f, name: e.target.value }));
                }}
              />
            </FormField>
            <FormField label="Código interno" htmlFor="internal_code" error={errors.internal_code}>
              <Input {...field("internal_code")} />
            </FormField>
            <FormField label="Código do fornecedor/fabricante" htmlFor="manufacturer_code" error={errors.manufacturer_code}>
              <Input {...field("manufacturer_code")} />
            </FormField>
            <FormField label="Observações" htmlFor="notes" error={errors.notes} className="md:col-span-2">
              <Textarea {...field("notes")} rows={2} />
            </FormField>
          </div>
          <Checkbox label="Peça ativa" checked={form.active} onChange={(e) => update({ active: e.target.checked })} />
          {nameTouched && !part && (
            <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => {
                setNameTouched(false);
                setForm((f) => ({ ...f, name: autoName(f) }));
              }}>
              Voltar a gerar o nome automaticamente
            </button>
          )}

          {similarParts.length > 0 && (
            <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="size-4" aria-hidden /> Encontramos peças semelhantes
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {similarParts.map((s) => (
                  <li key={s.id}>
                    <Link href={`/pecas/${s.id}`} target="_blank" className="underline">
                      {s.name}
                    </Link>
                    <span className="text-amber-800/80"> · {s.category_name}{s.device_model ? ` · ${s.device_model}` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {!part && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
            <h2 className="mb-3 text-sm font-semibold">Fornecedores e preços</h2>
            <OffersEditor rows={offers} suppliers={(suppliers.data ?? []).filter((s) => s.active)} errors={offerErrors} onChange={setOffers} />
            <p className="mt-2 text-xs text-slate-500">Código do fornecedor, link do produto e observações podem ser adicionados depois, na página da peça.</p>
          </section>
        )}

        <div className="flex justify-end gap-2">
          <LinkButton href={part ? `/pecas/${part.id}` : "/pecas"} variant="secondary" size="lg">
            Cancelar
          </LinkButton>
          <Button type="submit" size="lg" loading={saving}>
            {part ? "Salvar" : "Cadastrar peça"}
          </Button>
        </div>
      </form>

      <datalist id={listId("brand")}>{options.data?.brands.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id={listId("model")}>{options.data?.models.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id={listId("tech")}>{[...new Set([...(options.data?.technologies ?? []), ...TECHNOLOGY_SUGGESTIONS])].map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id={listId("quality")}>{[...new Set([...(options.data?.qualities ?? []), ...QUALITY_SUGGESTIONS])].map((v) => <option key={v} value={v} />)}</datalist>

      <ConfirmDialog
        open={askSimilar}
        destructive={false}
        title="Encontramos peças semelhantes"
        description={
          <>
            <p>Deseja verificar antes de cadastrar?</p>
            <ul className="mt-2 list-disc pl-5">
              {similarParts.map((s) => (
                <li key={s.id}>
                  <Link href={`/pecas/${s.id}`} target="_blank" className="text-brand-700 underline">{s.name}</Link>
                </li>
              ))}
            </ul>
          </>
        }
        confirmLabel="Cadastrar mesmo assim"
        cancelLabel="Verificar"
        onCancel={() => setAskSimilar(false)}
        onConfirm={async () => {
          setSimilarAck(true);
          setAskSimilar(false);
          await submit(true);
        }}
      />
    </div>
  );
}
