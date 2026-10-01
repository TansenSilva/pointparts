import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: Props) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600" aria-label="Paginação">
      <span>
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} icon={<ChevronLeft className="size-4" />}>
          Anterior
        </Button>
        <span className="tabular-nums">
          {page}/{pages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Próxima <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
