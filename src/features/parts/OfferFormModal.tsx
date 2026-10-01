"use client";

import { useState, type FormEvent } from "react";
import { FormField, Input, Select, Textarea } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { AVAILABILITY_OPTIONS } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { priceToInput } from "@/lib/format";
import { addOffer, updateOffer } from "@/lib/queries/offers";
import type { Availability, Offer, Supplier } from "@/lib/types";
import { offerSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";

interface Props {
  open: boolean;
  partId: string;
  /** Vínculo existente (edição) ou undefined (novo). */
  offer?: Offer;
  /** Fornecedores ainda não vinculados (somente no modo novo). */
  suppliers: Pick<Supplier, "id" | "name" | "active">[];
  onClose: () => void;
  onSaved: () => void;
}

export function OfferFormModal(props: Props) {
  // Remonta o formulário a cada abertura para começar com valores limpos.
  return props.open ? <OfferFormInner key={props.offer?.id ?? "new"} {...props} /> : null;
}

function OfferFormInner({ open, partId, offer, suppliers, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState({
    supplier_id: offer?.supplier_id ?? "",
    price: priceToInput(offer?.price),
    availability: (offer?.availability ?? "in_stock") as Availability,
    supplier_code: offer?.supplier_code ?? "",
    product_url: offer?.product_url ?? "",
    notes: offer?.notes ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = offerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (offer) {
        const { supplier_id: _ignored, ...rest } = parsed.data;
        void _ignored;
        await updateOffer(offer.id, rest);
        toast.success("Preço atualizado");
      } else {
        await addOffer(partId, parsed.data);
        toast.success("Fornecedor adicionado");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
      setSaving(false);
    }
  }

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={offer ? `Editar — ${offer.supplier.name}` : "Adicionar fornecedor"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="offer-form" loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="offer-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {!offer && (
          <FormField label="Fornecedor" htmlFor="o-supplier" required error={errors.supplier_id} className="sm:col-span-2">
            <Select id="o-supplier" value={form.supplier_id} onChange={(e) => set("supplier_id", e.target.value)} autoFocus>
              <option value="">Selecione...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {!s.active ? " (inativo)" : ""}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="Preço de custo" htmlFor="o-price" required error={errors.price}>
          <Input id="o-price" inputMode="decimal" placeholder="R$ 0,00" value={form.price} onChange={(e) => set("price", e.target.value)} autoFocus={!!offer} />
        </FormField>
        <FormField label="Disponibilidade" htmlFor="o-av">
          <Select id="o-av" value={form.availability} onChange={(e) => set("availability", e.target.value)}>
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Código da peça no fornecedor" htmlFor="o-code" error={errors.supplier_code}>
          <Input id="o-code" value={form.supplier_code} onChange={(e) => set("supplier_code", e.target.value)} />
        </FormField>
        <FormField label="Link direto do produto" htmlFor="o-url" error={errors.product_url}>
          <Input id="o-url" inputMode="url" placeholder="https://" value={form.product_url} onChange={(e) => set("product_url", e.target.value)} />
        </FormField>
        <FormField label="Observação" htmlFor="o-notes" error={errors.notes} className="sm:col-span-2">
          <Textarea id="o-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </FormField>
        <p className="text-xs text-slate-500 sm:col-span-2">A data da consulta é registrada automaticamente ao salvar.</p>
      </form>
    </Modal>
  );
}
