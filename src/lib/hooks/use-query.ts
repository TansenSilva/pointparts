"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";

interface State<T> {
  key: string;
  data?: T;
  error?: string;
}

export interface QueryResult<T> {
  /** Último dado carregado (mantido enquanto uma nova consulta carrega). */
  data: T | undefined;
  error: string | undefined;
  /** true enquanto a consulta atual (chaves/deps atuais) não terminou. */
  loading: boolean;
  reload: () => void;
}

/**
 * Hook mínimo de busca de dados: refaz a consulta quando `deps` mudam,
 * ignora respostas atrasadas e expõe `reload`. Passe `enabled = false` para pausar.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: readonly unknown[], enabled = true): QueryResult<T> {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<State<T>>({ key: "" });
  const key = `${JSON.stringify(deps)}#${nonce}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fn()
      .then((data) => {
        if (!cancelled) setState({ key, data });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState((prev) => ({ key, data: prev.data, error: friendlyError(e) }));
      });
    return () => {
      cancelled = true;
    };
    // `fn` é recriada a cada render; a identidade da consulta é definida por `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return {
    data: state.data,
    error: state.key === key ? state.error : undefined,
    loading: enabled && state.key !== key,
    reload,
  };
}
