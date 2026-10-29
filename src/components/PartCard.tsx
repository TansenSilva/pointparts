"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";
import { OfferList } from "@/components/OfferList";
import { PriceBadge } from "@/components/PriceBadge";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useQuery } from "@/lib/hooks/use-query";
import { listOffersForPart } from "@/lib/queries/offers";
import type { PartSummary } from "@/lib/types";

interface Props {
  part: PartSummary;
  staleDays: number;
  /** "expand": abre a comparação no próprio card. "link": leva à página da peça. */
  mode?: "expand" | "link";
  defaultOpen?: boolean;
}

export function PartMeta({ part }: { part: Pick<PartSummary, "category_name" | "brand" | "device_model" | "technology" | "quality"> }) {
  const items = [part.category_name, part.brand, part.device_model, part.technology, part.quality].filter(Boolean);
  return (
    <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-slate-500">
      {items.map((v, i) => (
        <span key={i} className="after:ml-1.5 after:content-['·'] last:after:content-none">
          {v}
        </span>
      ))}
    </p>
  );
}

function Summary({ part, staleDays }: { part: PartSummary; staleDays: number }) {
  const hasOffers = part.supplier_count > 0 && part.best_price !== null;
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 sm:items-center">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{part.name}</p>
        <PartMeta part={part} />
        {!part.active && <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 text-xs text-slate-500">Inativa</span>}
      </div>
      {hasOffers ? (
        <div className="w-full sm:w-auto sm:text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            {part.best_availability === "in_stock" ? "Melhor preço" : "Menor preço (sem estoque confirmado)"}
          </p>
          <PriceBadge value={part.best_price} best={part.best_availability === "in_stock"} size="lg" />
          <p className="text-xs text-slate-500">
            {part.best_supplier_name} · {part.supplier_count} {part.supplier_count === 1 ? "fornecedor" : "fornecedores"}
          </p>
          <LastUpdatedBadge checkedAt={part.best_checked_at} staleDays={staleDays} plain className="mt-0.5" />
        </div>
      ) : (
        <p className="text-sm text-slate-500">Nenhum fornecedor cadastrado</p>
      )}
    </div>
  );
}

export function PartCard({ part, staleDays, mode = "expand", defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const offers = useQuery(() => listOffersForPart(part.id), [part.id], mode === "expand" && open);

  if (mode === "link") {
    return (
      <Link href={`/pecas/${part.id}`} className="block rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-500">
        <Summary part={part} staleDays={staleDays} />
      </Link>
    );
  }

  return (
    <article className={cn("rounded-xl border bg-white", open ? "border-brand-500 shadow-sm" : "border-slate-200")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <Summary part={part} staleDays={staleDays} />
        </div>
        <ChevronDown className={cn("mt-1 size-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-slate-100 p-3">
          {offers.error ? (
            <ErrorState message={offers.error} onRetry={offers.reload} />
          ) : !offers.data ? (
            <LoadingState rows={3} label="Carregando fornecedores" />
          ) : (
            <OfferList offers={offers.data} staleDays={staleDays} />
          )}
          <div className="mt-3 flex justify-end">
            <LinkButton href={`/pecas/${part.id}`} variant="secondary" size="sm" icon={<ExternalLink className="size-4" />}>
              Abrir peça
            </LinkButton>
          </div>
        </div>
      )}
    </article>
  );
}
