"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { useApp } from "@/components/layout/AppProvider";
import { PageHeader } from "@/components/PageHeader";
import { PartCard } from "@/components/PartCard";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { Select } from "@/components/FormField";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { AVAILABILITY_OPTIONS, PAGE_SIZE, PART_SORT_OPTIONS, SEARCH_DEBOUNCE_MS, type PartSort } from "@/lib/constants";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useQuery } from "@/lib/hooks/use-query";
import { listOffersForParts } from "@/lib/queries/offers";
import { listSupplierOptions } from "@/lib/queries/suppliers";
import { filterOffers } from "@/lib/offers";
import { searchParts } from "@/lib/queries/parts";
import { useUrlQuery } from "./useUrlQuery";

export function SearchPage() {
  const { staleDays } = useApp();
  const [q, setQ] = useUrlQuery();
  const [sort, setSort] = useState<PartSort | "">("");
  const [supplier, setSupplier] = useState("");
  const [availability, setAvailability] = useState("");
  const suppliers = useQuery(listSupplierOptions, []);
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim(), SEARCH_DEBOUNCE_MS);

  // Sem texto: mostra o que foi atualizado recentemente; com texto: mais relevantes primeiro.
  const effectiveSort: PartSort = sort || (debounced ? "relevance" : "recent");
  const results = useQuery(async () => {
    const result = await searchParts({ q: debounced, sort: effectiveSort, page, supplier, availability });
    const offers = await listOffersForParts(result.rows.map((p) => p.id));
    return { ...result, offers };
  }, [debounced, effectiveSort, page, supplier, availability]);
  const searching = debounced !== q.trim() || results.loading;

  function changeQuery(v: string) {
    setQ(v);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Pesquisar peças" description="Busca por nome, categoria, marca, modelo, tecnologia, qualidade e códigos — em qualquer ordem." />
      <SearchBar value={q} onChange={changeQuery} loading={searching && !!results.data} autoFocus size="lg" />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">Fornecedor
          <Select value={supplier} onChange={(e) => { setSupplier(e.target.value); setPage(1); }}>
            <option value="">Todos os fornecedores</option>
            {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inativo)"}</option>)}
          </Select>
        </label>
        <label className="text-sm text-slate-600">Disponibilidade
          <Select value={availability} onChange={(e) => { setAvailability(e.target.value); setPage(1); }}>
            <option value="">Todas as disponibilidades</option>
            {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </label>
        {suppliers.error && <ErrorState message={suppliers.error} onRetry={suppliers.reload} />}
      </div>
      <p className="mt-3 text-xs text-slate-500">Compare peças da mesma tecnologia e qualidade. Preços e estoque dependem da última consulta cadastrada.</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p aria-live="polite">
          {results.data
            ? debounced
              ? `${results.data.total} ${results.data.total === 1 ? "peça encontrada" : "peças encontradas"}`
              : "Atualizadas recentemente"
            : " "}
        </p>
        <label className="flex items-center gap-2">
          Ordenar
          <Select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as PartSort | "");
              setPage(1);
            }}
            className="h-9 w-auto"
          >
            <option value="">{debounced ? "Mais relevantes" : "Recentes"}</option>
            {PART_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className={cn("mt-3 space-y-2", searching && results.data && "opacity-70 transition-opacity")}>
        {results.error ? (
          <ErrorState message={results.error} onRetry={results.reload} />
        ) : !results.data || searching ? (
          <LoadingState rows={4} label="Pesquisando" />
        ) : results.data.rows.length === 0 ? (
          <EmptyState
            title="Nenhuma peça encontrada"
            description="Tente menos palavras ou outro termo (ex.: “iphone 15”)."
            action={<LinkButton href="/pecas/nova">Cadastrar nova peça</LinkButton>}
          />
        ) : (
          results.data.rows.map((part) => (
            <PartCard key={`${part.id}-${supplier}-${availability}`} part={part} staleDays={staleDays} defaultOpen prefetchedOffers={filterOffers(results.data!.offers[part.id] ?? [], { supplier, availability }, staleDays)} />
          ))
        )}
      </div>
      {results.data && <Pagination page={page} pageSize={PAGE_SIZE} total={results.data.total} onChange={setPage} />}
    </div>
  );
}
