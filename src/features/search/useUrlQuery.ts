"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

/** Texto de pesquisa sincronizado com ?q= (compartilhável, sem recarregar a página). */
export function useUrlQuery(): [string, (value: string) => void] {
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(params.get("q") ?? "");

  const update = useCallback(
    (value: string) => {
      setQ(value);
      const url = value.trim() ? `${pathname}?q=${encodeURIComponent(value)}` : pathname;
      window.history.replaceState(null, "", url);
    },
    [pathname],
  );
  return [q, update];
}
