"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import { AVAILABILITY_OPTIONS } from "@/lib/constants";
import type { Availability, Supplier } from "@/lib/types";

export interface OfferDraft {
  key: number;
  supplier_id: string;
  price: string;
  availability: Availability;
}

interface Props {
  rows: OfferDraft[];
  suppliers: Pick<Supplier, "id" | "name" | "active">[];
  errors: Record<number, string>;
  onChange: (rows: OfferDraft[]) => void;
}

let counter = 1;
export const newOfferDraft = (): OfferDraft => ({ key: counter++, supplier_id: "", price: "", availability: "in_stock" });

/** Lista de "Fornecedor — R$ preço — estoque" para o cadastro rápido. */
export function OffersEditor({ rows, suppliers, errors, onChange }: Props) {
  const update = (key: number, patch: Partial<OfferDraft>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const chosen = new Set(rows.map((r) => r.supplier_id).filter(Boolean));

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={row.key} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,2fr)_9rem_10rem_auto]">
            <Select
              aria-label={`Fornecedor ${i + 1}`}
              value={row.supplier_id}
              onChange={(e) => update(row.key, { supplier_id: e.target.value })}
              className="col-span-2 md:col-span-1"
            >
              <option value="">Fornecedor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id} disabled={chosen.has(s.id) && row.supplier_id !== s.id}>
                  {s.name}
                  {!s.active ? " (inativo)" : ""}
                </option>
              ))}
            </Select>
            <Input
              aria-label={`Preço ${i + 1}`}
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={row.price}
              onChange={(e) => update(row.key, { price: e.target.value })}
            />
            <Select aria-label={`Disponibilidade ${i + 1}`} value={row.availability} onChange={(e) => update(row.key, { availability: e.target.value as Availability })}>
              {AVAILABILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button variant="ghost" onClick={() => onChange(rows.filter((r) => r.key !== row.key))} aria-label="Remover linha" className="col-span-2 text-red-600 hover:bg-red-50 md:col-span-1">
              <Trash2 className="size-4" />
            </Button>
          </div>
          {errors[row.key] && <p role="alert" className="mt-1 text-xs text-red-600">{errors[row.key]}</p>}
        </div>
      ))}
      <Button variant="secondary" onClick={() => onChange([...rows, newOfferDraft()])} icon={<Plus className="size-4" />}>
        Adicionar fornecedor
      </Button>
    </div>
  );
}
