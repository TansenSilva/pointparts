"use client";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { LinkButton } from "@/components/ui/Button";
import { useQuery } from "@/lib/hooks/use-query";
import { getSupplier } from "@/lib/queries/suppliers";
import { SupplierForm } from "./SupplierForm";

export function SupplierEditPage({ id }: { id: string }) {
  const { data, error, loading, reload } = useQuery(() => getSupplier(id), [id]);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || data === undefined) return <LoadingState rows={3} />;
  if (!data) return <EmptyState title="Fornecedor não encontrado" action={<LinkButton href="/fornecedores">Voltar</LinkButton>} />;
  return <SupplierForm supplier={data} />;
}
