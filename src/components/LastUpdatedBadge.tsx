"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatFullDate, formatRelativeDate } from "@/lib/format";
import { isStale } from "@/lib/offers";

interface Props {
  checkedAt: string | null | undefined;
  staleDays: number;
  /** Texto "Preço possivelmente desatualizado" em linha própria. */
  showWarning?: boolean;
  prefix?: string;
  /** Sem interação (para uso dentro de botões/links). */
  plain?: boolean;
  className?: string;
}

/** Idade do preço. Clique alterna entre "Há 3 dias" e a data completa. */
export function LastUpdatedBadge({ checkedAt, staleDays, showWarning = true, prefix = "Atualizado", plain, className }: Props) {
  const [full, setFull] = useState(false);
  if (!checkedAt) return <span className="text-xs text-slate-400">Sem data</span>;
  const stale = isStale(checkedAt, staleDays);
  const relative = formatRelativeDate(checkedAt);
  const label = full ? formatFullDate(checkedAt) : (prefix ? `${prefix} ${relative.charAt(0).toLowerCase()}${relative.slice(1)}` : relative);

  const tone = cn("inline-flex items-center gap-1 text-xs", stale ? "font-medium text-amber-700" : "text-slate-500");
  const icon = stale ? <AlertTriangle className="size-3.5" aria-hidden /> : <Clock className="size-3.5" aria-hidden />;

  if (plain) {
    return (
      <span title={formatFullDate(checkedAt)} className={cn(tone, className)}>
        {icon}
        {label}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-col items-start leading-tight", className)}>
      <button
        type="button"
        onClick={() => setFull((v) => !v)}
        title={formatFullDate(checkedAt)}
        className={cn(tone, "hover:underline")}
      >
        {icon}
        {label}
      </button>
      {stale && showWarning && <span className="text-[11px] text-amber-700">Preço possivelmente desatualizado</span>}
    </span>
  );
}
