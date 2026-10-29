"use client";

import Link from "next/link";
import { ExternalLink, MessageCircle, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { EmptyState } from "@/components/EmptyState";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { useApp } from "@/components/layout/AppProvider";
import { OfferList } from "@/components/OfferList";
import { PartMeta } from "@/components/PartCard";
import { PageHeader } from "@/components/PageHeader";
import { PriceBadge } from "@/components/PriceBadge";
import { SearchBar } from "@/components/SearchBar";
import { ExternalButton, LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { whatsappUrl } from "@/lib/format";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useQuery } from "@/lib/hooks/use-query";
import { pickBestOffer } from "@/lib/offers";
import { listOffersForPart } from "@/lib/queries/offers";
import { searchParts } from "@/lib/queries/parts";
import type { Offer, PartSummary } from "@/lib/types";
import { useUrlQuery } from "./useUrlQuery";

const EXAMPLES = ["tela soft oled iphone 15", "bateria s23", "conector a54", "iphone 15 pro"];

export function QuickLookup() {
  const { staleDays } = useApp();
  const [q, setQ] = useUrlQuery();
  const debounced = useDebounce(q.trim(), SEARCH_DEBOUNCE_MS);
  const [selectedId, setSelectedId] = useState<string>();

  const results = useQuery(() => searchParts({ q: debounced, sort: "relevance", pageSize: 8 }), [debounced], debounced.length > 0);
  const rows = debounced ? (results.data?.rows ?? []) : [];
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];
  const searching = debounced !== q.trim() || results.loading;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Consulta rápida" description="Digite a peça e veja na hora quem tem e quem vende mais barato." />
      <SearchBar value={q} onChange={setQ} loading={searching && q.trim().length > 0} autoFocus size="lg" placeholder="Pesquise uma peça..." />

      <div className="mt-5">
        {!debounced ? (
          <div className="text-sm text-slate-500">
            <p className="mb-2">Experimente:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setQ(ex)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 hover:border-brand-500 hover:text-brand-700">
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : results.error ? (
          <ErrorState message={results.error} onRetry={results.reload} />
        ) : !results.data ? (
          <LoadingState rows={2} label="Pesquisando" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nenhuma peça encontrada"
            description="Tente menos palavras (ex.: “tela 15”) ou cadastre a peça."
            action={<LinkButton href="/pecas/nova" size="md">Cadastrar nova peça</LinkButton>}
          />
        ) : (
          <div className={cn("space-y-4", searching && "opacity-70 transition-opacity")}>
            {selected && <SelectedPart key={selected.id} part={selected} staleDays={staleDays} />}
            {rows.length > 1 && (
              <section aria-label="Outras peças encontradas">
                <h2 className="mb-2 text-sm font-medium text-slate-600">
                  {results.data.total > rows.length ? `${results.data.total} peças encontradas — mostrando ${rows.length}` : "Outras peças encontradas"}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <OtherPartButton part={r} active={r.id === selected?.id} onSelect={() => setSelectedId(r.id)} />
                    </li>
                  ))}
                </ul>
                {results.data.total > rows.length && (
                  <p className="mt-2 text-sm">
                    <Link href={`/pesquisar?q=${encodeURIComponent(debounced)}`} className="text-brand-700 hover:underline">
                      Ver todos os resultados
                    </Link>
                  </p>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OtherPartButton({ part, active, onSelect }: { part: PartSummary; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={cn("flex w-full items-center justify-between gap-3 rounded-xl border bg-white p-3 text-left", active ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200 hover:border-slate-400")}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{part.name}</span>
        <span className="text-xs text-slate-500">{part.supplier_count} fornecedores</span>
      </span>
      <PriceBadge value={part.best_price} best={part.best_availability === "in_stock"} />
    </button>
  );
}

function SelectedPart({ part, staleDays }: { part: PartSummary; staleDays: number }) {
  const offers = useQuery(() => listOffersForPart(part.id), [part.id]);
  const best = offers.data ? pickBestOffer(offers.data) : null;

  return (
    <section className="space-y-3" aria-label={part.name}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight md:text-2xl">{part.name}</h2>
          <PartMeta part={part} />
        </div>
        <LinkButton href={`/pecas/${part.id}`} variant="secondary" size="sm" icon={<ExternalLink className="size-4" />}>
          Abrir peça
        </LinkButton>
      </div>

      {offers.error ? (
        <ErrorState message={offers.error} onRetry={offers.reload} />
      ) : !offers.data ? (
        <LoadingState rows={3} label="Carregando fornecedores" />
      ) : offers.data.length === 0 ? (
        <EmptyState title="Nenhum fornecedor cadastrado para esta peça" action={<LinkButton href={`/pecas/${part.id}`}>Adicionar fornecedores</LinkButton>} />
      ) : (
        <>
          {best && <BestOfferPanel offer={best} staleDays={staleDays} />}
          <OfferList offers={offers.data} staleDays={staleDays} />
        </>
      )}
    </section>
  );
}

function BestOfferPanel({ offer, staleDays }: { offer: Offer; staleDays: number }) {
  const inStock = offer.availability === "in_stock";
  const wa = whatsappUrl(offer.supplier.whatsapp);
  return (
    <div className={cn("rounded-2xl border-2 p-4 md:p-5", inStock ? "border-emerald-500 bg-emerald-50" : "border-amber-400 bg-amber-50")}>
      <p className={cn("text-xs font-bold uppercase tracking-wide", inStock ? "text-emerald-700" : "text-amber-800")}>
        {inStock ? "Melhor opção disponível" : "Nenhum fornecedor com estoque confirmado — menor preço"}
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <Link href={`/fornecedores/${offer.supplier.id}`} className="text-lg font-semibold hover:underline">
            {offer.supplier.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <AvailabilityBadge value={offer.availability} />
            <LastUpdatedBadge checkedAt={offer.checked_at} staleDays={staleDays} />
          </div>
        </div>
        <PriceBadge value={offer.price} best={inStock} size="xl" />
      </div>
      {(wa || offer.product_url) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {wa && (
            <ExternalButton href={wa} variant="success" icon={<MessageCircle className="size-4" />}>
              WhatsApp
            </ExternalButton>
          )}
          {offer.product_url && (
            <ExternalButton href={offer.product_url} variant="secondary" icon={<ShoppingBag className="size-4" />}>
              Abrir produto
            </ExternalButton>
          )}
        </div>
      )}
    </div>
  );
}
