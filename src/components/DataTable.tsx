"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Link da linha (desktop) — o card mobile deve cuidar do próprio link. */
  rowHref?: (row: T) => string;
  /** Cartão para telas pequenas. Sem ele, a tabela rola horizontalmente. */
  renderCard?: (row: T) => ReactNode;
  dimmed?: (row: T) => boolean;
}

/** Tabela compacta no desktop e lista de cards no celular. */
export function DataTable<T>({ columns, rows, rowKey, rowHref, renderCard, dimmed }: Props<T>) {
  return (
    <>
      {renderCard && <div className="space-y-2 md:hidden">{rows.map((r) => <div key={rowKey(r)}>{renderCard(r)}</div>)}</div>}
      <div className={cn("overflow-x-auto rounded-xl border border-slate-200 bg-white", renderCard && "hidden md:block")}>
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("px-3 py-2 font-medium", c.align === "right" ? "text-right" : "text-left", c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className={cn("hover:bg-slate-50", dimmed?.(row) && "opacity-60")}>
                {columns.map((c, i) => (
                  <td key={c.key} className={cn("px-3 py-2 align-middle", c.align === "right" && "text-right", c.className)}>
                    {i === 0 && rowHref ? (
                      <Link href={rowHref(row)} className="block font-medium text-slate-900 hover:text-brand-700">
                        {c.cell(row)}
                      </Link>
                    ) : (
                      c.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
