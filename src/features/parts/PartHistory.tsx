"use client";

import { useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { Pagination } from "@/components/Pagination";
import { PriceBadge } from "@/components/PriceBadge";
import { PriceChange } from "@/components/PriceChange";
import { formatFullDate } from "@/lib/format";
import { useQuery } from "@/lib/hooks/use-query";
import { listPriceHistory } from "@/lib/queries/history";

/** Histórico de preços de uma peça (todos os fornecedores), do mais recente ao mais antigo. */
export function PartHistory({ partId, refreshKey }: { partId: string; refreshKey: number }) {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useQuery(() => listPriceHistory({ partId, page, pageSize: 10 }), [partId, page, refreshKey]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <LoadingState rows={2} />;
  if (data.rows.length === 0) return <EmptyState title="Sem histórico ainda" description="As alterações de preço aparecerão aqui." />;

  return (
    <>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {data.rows.map((h) => (
          <li key={h.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{h.supplier_name}</p>
              <p className="text-xs text-slate-500">{formatFullDate(h.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              <PriceChange oldPrice={h.old_price} newPrice={h.new_price} />
              {h.old_price !== null && <PriceBadge value={h.old_price} muted size="sm" className="line-through" />}
              <PriceBadge value={h.new_price} size="sm" />
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={10} total={data.total} onChange={setPage} />
    </>
  );
}
