import Link from "next/link";
import { MessageCircle, Package } from "lucide-react";
import { cn } from "@/lib/cn";
import { whatsappUrl } from "@/lib/format";
import type { Supplier } from "@/lib/types";
import { ExternalButton } from "@/components/ui/Button";

interface Props {
  supplier: Supplier;
  partCount?: number;
}

export function SupplierStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

export function SupplierCard({ supplier, partCount }: Props) {
  const wa = whatsappUrl(supplier.whatsapp);
  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white p-3", !supplier.active && "opacity-70")}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/fornecedores/${supplier.id}`} className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{supplier.name}</p>
          <p className="truncate text-sm text-slate-500">{supplier.contact_name || "Sem contato"}</p>
        </Link>
        <SupplierStatusBadge active={supplier.active} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <Package className="size-3.5" aria-hidden />
          {partCount ?? 0} peças
        </span>
        {wa && (
          <ExternalButton href={wa} size="sm" variant="secondary" icon={<MessageCircle className="size-4 text-emerald-600" />}>
            WhatsApp
          </ExternalButton>
        )}
      </div>
    </div>
  );
}
