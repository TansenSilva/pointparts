import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: ReactNode;
}

export function PageHeader({ title, description, actions, back }: Props) {
  return (
    <div className="mb-4 md:mb-5">
      {back && <div className="mb-1.5 text-sm">{back}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
