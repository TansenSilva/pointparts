import { cn } from "@/lib/cn";
import { AVAILABILITY_LABEL } from "@/lib/constants";
import type { Availability } from "@/lib/types";

const styles: Record<Availability, string> = {
  in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  out_of_stock: "bg-red-50 text-red-700 ring-red-600/20",
  on_request: "bg-amber-50 text-amber-800 ring-amber-600/20",
  unknown: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const dots: Record<Availability, string> = {
  in_stock: "bg-emerald-500",
  out_of_stock: "bg-red-500",
  on_request: "bg-amber-500",
  unknown: "bg-slate-400",
};

export function AvailabilityBadge({ value, className }: { value: Availability; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", styles[value], className)}>
      <span className={cn("size-1.5 rounded-full", dots[value])} aria-hidden />
      {AVAILABILITY_LABEL[value]}
    </span>
  );
}
