"use client";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { LinkButton } from "@/components/ui/Button";
import { useQuery } from "@/lib/hooks/use-query";
import { getPart } from "@/lib/queries/parts";
import { PartForm } from "./PartForm";

export function PartEditPage({ id }: { id: string }) {
  const { data, error, loading, reload } = useQuery(() => getPart(id), [id]);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || data === undefined) return <LoadingState rows={3} />;
  if (!data) return <EmptyState title="Peça não encontrada" action={<LinkButton href="/pecas">Voltar</LinkButton>} />;
  return <PartForm part={data} />;
}
