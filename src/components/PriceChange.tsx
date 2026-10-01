import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";

/** Variação entre o preço anterior e o novo (verde = baixou, vermelho = subiu). */
export function PriceChange({ oldPrice, newPrice }: { oldPrice: number | null; newPrice: number }) {
  if (oldPrice === null) return <span className="text-xs text-slate-400">Primeiro registro</span>;
  const diff = newPrice - oldPrice;
  const pct = oldPrice > 0 ? (diff / oldPrice) * 100 : 0;
  const Icon = diff === 0 ? Minus : diff > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", diff > 0 ? "text-red-600" : diff < 0 ? "text-emerald-600" : "text-slate-500")}>
      <Icon className="size-3.5" aria-hidden />
      {formatBRL(Math.abs(diff))} ({Math.abs(pct).toFixed(1).replace(".", ",")}%)
    </span>
  );
}
