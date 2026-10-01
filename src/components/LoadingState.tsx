import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-slate-400", className)} aria-label="Carregando" />;
}

/** Placeholders animados enquanto os dados carregam. */
export function LoadingState({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2" role="status" aria-busy="true">
      {label && <span className="sr-only">{label}</span>}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-medium underline">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
