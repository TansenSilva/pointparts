import { SearchX } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <div className="mb-3 text-slate-400">{icon ?? <SearchX className="size-9" aria-hidden />}</div>
      <p className="font-medium text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
