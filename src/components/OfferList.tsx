"use client";

import Link from "next/link";
import { Check, ExternalLink, MessageCircle, Pencil, ShoppingBag, SlidersHorizontal, Store, Trash2, X } from "lucide-react";
import { useState } from "react";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { Input, Select } from "@/components/FormField";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";
import { BestPriceTag, PriceBadge } from "@/components/PriceBadge";
import { Button, ExternalButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { AVAILABILITY_OPTIONS } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { formatBRL, priceToInput, whatsappUrl } from "@/lib/format";
import { pickBestOffer, sortOffers } from "@/lib/offers";
import { confirmOffer, quickUpdateOffer } from "@/lib/queries/offers";
import type { Availability, Offer } from "@/lib/types";
import { quickOfferSchema } from "@/lib/validation";

interface ManageProps {
  /** Chamado após qualquer alteração salva (o pai recarrega os dados). */
  onChanged: () => void;
  onEditDetails: (offer: Offer) => void;
  onRemove: (offer: Offer) => void;
}

interface Props {
  offers: Offer[];
  staleDays: number;
  /** Habilita edição rápida, confirmação, detalhes e remoção. */
  manage?: ManageProps;
}

const GRID = "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1fr)_7rem_8rem_9.5rem_minmax(0,1.5fr)] md:items-center";

export function OfferList({ offers, staleDays, manage }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const sorted = sortOffers(offers);
  const best = pickBestOffer(offers);

  if (sorted.length === 0) {
    return <p className="py-4 text-center text-sm text-slate-500">Nenhum fornecedor vinculado a esta peça.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className={cn(GRID, "hidden border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid")}>
        <span>Fornecedor</span>
        <span>Preço</span>
        <span>Estoque</span>
        <span>Atualizado</span>
        <span className="text-right">Ações</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {sorted.map((offer) => (
          <OfferRow
            key={offer.id}
            offer={offer}
            isBest={best?.id === offer.id}
            staleDays={staleDays}
            manage={manage}
            editing={editingId === offer.id}
            onEdit={setEditingId}
          />
        ))}
      </ul>
    </div>
  );
}

interface RowProps {
  offer: Offer;
  isBest: boolean;
  staleDays: number;
  manage?: ManageProps;
  editing: boolean;
  onEdit: (id: string | null) => void;
}

function OfferRow({ offer, isBest, staleDays, manage, editing, onEdit }: RowProps) {
  const toast = useToast();
  const [price, setPrice] = useState(priceToInput(offer.price));
  const [availability, setAvailability] = useState<Availability>(offer.availability);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const wa = whatsappUrl(offer.supplier.whatsapp);
  const inStockBest = isBest && offer.availability === "in_stock";

  function startEdit() {
    setPrice(priceToInput(offer.price));
    setAvailability(offer.availability);
    setError(undefined);
    onEdit(offer.id);
  }

  async function save() {
    const parsed = quickOfferSchema.safeParse({ price, availability });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Valor inválido");
      return;
    }
    setSaving(true);
    try {
      await quickUpdateOffer(offer.id, parsed.data);
      toast.success(`${offer.supplier.name}: ${formatBRL(parsed.data.price)} salvo`);
      onEdit(null);
      manage?.onChanged();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function confirm() {
    setSaving(true);
    try {
      await confirmOffer(offer.id);
      toast.success("Preço confirmado como atual");
      manage?.onChanged();
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li
      className={cn(
        GRID,
        "px-3 py-3 md:py-2.5",
        inStockBest && "border-l-4 border-l-emerald-500 bg-emerald-50/60",
        !offer.supplier.active && "opacity-70",
      )}
    >
      {/* Fornecedor */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/fornecedores/${offer.supplier.id}`} className="truncate font-medium text-slate-900 hover:text-brand-700">
            {offer.supplier.name}
          </Link>
          {isBest && (inStockBest ? <BestPriceTag /> : <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">MENOR PREÇO</span>)}
          {!offer.supplier.active && <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">Inativo</span>}
        </div>
        {(offer.supplier_code || offer.notes) && (
          <p className="truncate text-xs text-slate-500">
            {offer.supplier_code && <span>Cód. {offer.supplier_code}</span>}
            {offer.supplier_code && offer.notes && " · "}
            {offer.notes}
          </p>
        )}
      </div>

      {editing ? (
        <div className="col-span-2 flex flex-wrap items-start gap-2 md:col-span-3">
          <div>
            <Input
              autoFocus
              inputMode="decimal"
              aria-label={`Preço ${offer.supplier.name}`}
              aria-invalid={!!error}
              value={price}
              placeholder="0,00"
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
                if (e.key === "Escape") onEdit(null);
              }}
              className="w-28"
            />
            {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
          </div>
          <Select
            aria-label="Disponibilidade"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as Availability)}
            className="w-36"
          >
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button variant="success" onClick={save} loading={saving} icon={<Check className="size-4" />}>
            Salvar
          </Button>
          <Button variant="ghost" onClick={() => onEdit(null)} disabled={saving} icon={<X className="size-4" />}>
            Cancelar
          </Button>
        </div>
      ) : (
        <>
          <div className="text-right md:text-left">
            <PriceBadge value={offer.price} best={inStockBest} muted={offer.availability === "out_of_stock"} size="lg" />
          </div>
          <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 md:col-span-2 md:contents">
            <AvailabilityBadge value={offer.availability} className="md:justify-self-start" />
            <LastUpdatedBadge checkedAt={offer.checked_at} staleDays={staleDays} />
          </div>
        </>
      )}

      {/* Ações */}
      <div className="col-span-2 flex flex-wrap items-center gap-1.5 md:col-span-1 md:flex-nowrap md:justify-end">
        {!editing && (
          <>
            {manage && (
              <Button size="sm" variant="primary" onClick={startEdit} icon={<Pencil className="size-3.5" />}>
                Editar
              </Button>
            )}
            {wa && (
              <ExternalButton href={wa} size="sm" variant="secondary" icon={<MessageCircle className="size-3.5 text-emerald-600" />}>
                WhatsApp
              </ExternalButton>
            )}
            {offer.product_url && (
              <ExternalButton href={offer.product_url} size="sm" variant="secondary" icon={<ShoppingBag className="size-3.5" />}>
                Produto
              </ExternalButton>
            )}
            {!manage && (
              <Link
                href={`/fornecedores/${offer.supplier.id}`}
                title="Abrir fornecedor"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Store className="size-3.5" aria-hidden />
                <span className="md:sr-only">Fornecedor</span>
              </Link>
            )}
            {!manage && offer.supplier.website && (
              <ExternalButton href={offer.supplier.website} size="sm" variant="ghost" aria-label="Abrir site do fornecedor" title="Site do fornecedor">
                <ExternalLink className="size-3.5" />
              </ExternalButton>
            )}
            {manage && (
              <>
                <Button size="sm" variant="ghost" onClick={confirm} disabled={saving} title="Preço continua o mesmo (atualiza a data)" aria-label="Confirmar preço">
                  <Check className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => manage.onEditDetails(offer)} title="Código, link e observações" aria-label="Detalhes">
                  <SlidersHorizontal className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => manage.onRemove(offer)} title="Remover fornecedor desta peça" aria-label="Remover" className="text-red-600 hover:bg-red-50">
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </li>
  );
}
