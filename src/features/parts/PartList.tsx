"use client";

import { Filter, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { FormField, Select } from "@/components/FormField";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { useApp } from "@/components/layout/AppProvider";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { PartCard } from "@/components/PartCard";
import { PriceBadge } from "@/components/PriceBadge";
import { SearchBar } from "@/components/SearchBar";
import { Button, LinkButton } from "@/components/ui/Button";
import { AVAILABILITY_OPTIONS, PAGE_SIZE, PART_SORT_OPTIONS, type PartSort } from "@/lib/constants";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useQuery } from "@/lib/hooks/use-query";
import { listCategories } from "@/lib/queries/categories";
import { getFilterOptions, searchParts } from "@/lib/queries/parts";
import { listSupplierOptions } from "@/lib/queries/suppliers";
import type { PartSummary } from "@/lib/types";

interface Filters {
  category: string;
  brand: string;
  model: string;
  technology: string;
  quality: string;
  supplier: string;
  availability: string;
  status: "" | "active" | "inactive";
}

const EMPTY: Filters = { category: "", brand: "", model: "", technology: "", quality: "", supplier: "", availability: "", status: "" };

export function PartList() {
  const { staleDays } = useApp();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<PartSort>("name");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const debounced = useDebounce(q.trim(), 300);

  const categories = useQuery(listCategories, []);
  const suppliers = useQuery(listSupplierOptions, []);
  const options = useQuery(getFilterOptions, []);

  const results = useQuery(
    () =>
      searchParts({
        q: debounced,
        ...filters,
        active: filters.status === "" ? null : filters.status === "active",
        sort,
        page,
      }),
    [debounced, filters, sort, page],
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const columns: Column<PartSummary>[] = [
    {
      key: "name",
      header: "Peça",
      cell: (p) => (
        <>
          {p.name}
          {!p.active && <span className="ml-2 rounded bg-slate-100 px-1.5 text-xs font-normal text-slate-500">Inativa</span>}
        </>
      ),
    },
    { key: "cat", header: "Categoria", cell: (p) => p.category_name },
    { key: "brand", header: "Marca", cell: (p) => p.brand || "—" },
    { key: "model", header: "Modelo", cell: (p) => p.device_model || "—" },
    { key: "tech", header: "Tipo / Qualidade", cell: (p) => [p.technology, p.quality].filter(Boolean).join(" · ") || "—" },
    {
      key: "price",
      header: "Melhor preço",
      align: "right",
      cell: (p) =>
        p.best_price === null ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span title={p.best_supplier_name ?? undefined}>
            <PriceBadge value={p.best_price} best={p.best_availability === "in_stock"} size="sm" />
            <span className="block text-xs text-slate-500">{p.best_supplier_name}</span>
          </span>
        ),
    },
    { key: "count", header: "Forn.", align: "right", cell: (p) => p.supplier_count },
    { key: "upd", header: "Data do melhor preço", cell: (p) => <LastUpdatedBadge checkedAt={p.best_checked_at} staleDays={staleDays} showWarning={false} prefix="" /> },
  ];

  const sel = (key: keyof Filters, label: string, items: { value: string; label: string }[]) => (
    <FormField label={label} htmlFor={`f-${key}`}>
      <Select id={`f-${key}`} value={filters[key]} onChange={(e) => setFilter(key, e.target.value as never)} className="h-9">
        <option value="">Todos</option>
        {items.map((i) => (
          <option key={i.value} value={i.value}>
            {i.label}
          </option>
        ))}
      </Select>
    </FormField>
  );
  const strings = (a: string[] | undefined) => (a ?? []).map((v) => ({ value: v, label: v }));

  return (
    <div>
      <PageHeader
        title="Peças"
        actions={
          <LinkButton href="/pecas/nova" icon={<Plus className="size-4" />}>
            Nova peça
          </LinkButton>
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchBar
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          loading={results.loading && !!results.data}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Select value={sort} onChange={(e) => setSort(e.target.value as PartSort)} className="h-11 sm:w-56" aria-label="Ordenar por">
            {PART_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Ordenar: {o.label}
              </option>
            ))}
          </Select>
          <Button variant="secondary" size="lg" className="h-11" onClick={() => setShowFilters((v) => !v)} icon={<Filter className="size-4" />}>
            Filtros{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {sel("category", "Categoria", (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })))}
            {sel("brand", "Marca", strings(options.data?.brands))}
            {sel("model", "Modelo", strings(options.data?.models))}
            {sel("technology", "Tipo", strings(options.data?.technologies))}
            {sel("quality", "Qualidade", strings(options.data?.qualities))}
            {sel("supplier", "Fornecedor", (suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })))}
            {sel("availability", "Disponibilidade", AVAILABILITY_OPTIONS)}
            {sel("status", "Situação", [
              { value: "active", label: "Ativas" },
              { value: "inactive", label: "Inativas" },
            ])}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setFilters(EMPTY); setPage(1); }} icon={<RotateCcw className="size-3.5" />}>
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {results.error ? (
        <ErrorState message={results.error} onRetry={results.reload} />
      ) : !results.data ? (
        <LoadingState label="Carregando peças" />
      ) : results.data.rows.length === 0 ? (
        <EmptyState
          title={debounced || activeFilterCount ? "Nenhuma peça encontrada" : "Nenhuma peça cadastrada"}
          description={debounced || activeFilterCount ? "Ajuste a pesquisa ou limpe os filtros." : "Cadastre a primeira peça e vincule os fornecedores."}
          action={<LinkButton href="/pecas/nova">Nova peça</LinkButton>}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={results.data.rows}
            rowKey={(p) => p.id}
            rowHref={(p) => `/pecas/${p.id}`}
            dimmed={(p) => !p.active}
            renderCard={(p) => <PartCard part={p} staleDays={staleDays} mode="link" />}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={results.data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
