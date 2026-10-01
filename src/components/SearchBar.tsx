"use client";

import { Search, X } from "lucide-react";
import type { FormEvent } from "react";
import { Spinner } from "@/components/LoadingState";
import { cn } from "@/lib/cn";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  autoFocus?: boolean;
  size?: "md" | "lg";
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Pesquise uma peça, modelo ou código...",
  loading,
  autoFocus,
  size = "md",
  className,
}: Props) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit?.(value);
  }
  return (
    <form role="search" onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search
        className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400", size === "lg" ? "left-4 size-6" : "left-3 size-5")}
        aria-hidden
      />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "block w-full rounded-xl border border-slate-300 bg-white text-slate-900 shadow-sm placeholder:text-slate-400",
          "focus:border-brand-500 focus:outline-2 focus:outline-brand-500/30 [&::-webkit-search-cancel-button]:hidden",
          size === "lg" ? "h-14 pl-13 pr-12 text-lg md:h-16 md:text-xl" : "h-11 pl-10 pr-10 text-base",
        )}
      />
      <div className={cn("absolute top-1/2 -translate-y-1/2", size === "lg" ? "right-4" : "right-3")}>
        {loading ? (
          <Spinner />
        ) : value ? (
          <button type="button" onClick={() => onChange("")} aria-label="Limpar pesquisa" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="size-5" />
          </button>
        ) : null}
      </div>
    </form>
  );
}
