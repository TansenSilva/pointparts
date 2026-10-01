"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { PriceBadge } from "@/components/PriceBadge";
import { PriceChange } from "@/components/PriceChange";
import { SearchBar } from "@/components/SearchBar";
import { PAGE_SIZE } from "@/lib/constants";
import { formatFullDate } from "@/lib/format";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useQuery } from "@/lib/hooks/use-query";
import { listPriceHistory } from "@/lib/queries/history";
import type { PriceHistoryRow } from "@/lib/types";

const columns: Column<PriceHistoryRow>[] = [
  { key: "date", header: "Data", cell: (h) => <span className="whitespace-nowrap font-normal text-slate-600">{formatFullDate(h.created_at)}</span> },
  { key: "part", header: "Peça", cell: (h) => <Link href={`/pecas/${h.part_id}`} className="font-medium hover:text-brand-700">{h.part_name}</Link> },
  { key: "supplier", header: "Fornecedor", cell: (h) => <Link href={`/fornecedores/${h.supplier_id}`} className="hover:text-brand-700">{h.supplier_name}</Link> },
  { key: "old", header: "Anterior", align: "right", cell: (h) => (h.old_price === null ? "—" : <PriceBadge value={h.old_price} size="sm" muted />) },
  { key: "new", header: "Novo", align: "right", cell: (h) => <PriceBadge value={h.new_price} size="sm" /> },
  { key: "diff", header: "Variação", cell: (h) => <PriceChange oldPrice={h.old_price} newPrice={h.new_price} /> },
];

export function HistoryPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q.trim(), 300);
  const { data, error, loading, reload } = useQuery(() => listPriceHistory({ q: debounced, page }), [debounced, page]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Histórico de preços" description="Todas as alterações de preço, da mais recente para a mais antiga." />
      <SearchBar
        value={q}
        onChange={(v) => {
          setQ(v);
          setPage(1);
        }}
        placeholder="Filtrar por peça ou fornecedor..."
        loading={loading && !!data}
        className="mb-3"
      />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingState label="Carregando histórico" />
      ) : data.rows.length === 0 ? (
        <EmptyState title="Nenhum registro encontrado" description="O histórico é criado automaticamente sempre que um preço muda." />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data.rows}
            rowKey={(h) => h.id}
            renderCard={(h) => (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <Link href={`/pecas/${h.part_id}`} className="font-medium">{h.part_name}</Link>
                <p className="text-sm text-slate-500">{h.supplier_name}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {h.old_price !== null && <PriceBadge value={h.old_price} muted size="sm" className="line-through" />}
                    <PriceBadge value={h.new_price} size="sm" />
                  </span>
                  <PriceChange oldPrice={h.old_price} newPrice={h.new_price} />
                </div>
                <p className="mt-1 text-xs text-slate-400">{formatFullDate(h.created_at)}</p>
              </div>
            )}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
