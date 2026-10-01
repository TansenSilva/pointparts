import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBRL } from "@/lib/format";

interface Props {
  value: number | null | undefined;
  /** Menor preço disponível: destaque verde e selo "MELHOR PREÇO". */
  best?: boolean;
  /** Sem estoque: preço esmaecido. */
  muted?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-3xl" };

export function PriceBadge({ value, best, muted, size = "md", className }: Props) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-semibold tabular-nums",
        sizes[size],
        best ? "text-emerald-700" : muted ? "text-slate-400" : "text-slate-900",
        className,
      )}
    >
      {formatBRL(value)}
    </span>
  );
}

export function BestPriceTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white", className)}>
      <Trophy className="size-3" aria-hidden />
      MELHOR PREÇO
    </span>
  );
}
