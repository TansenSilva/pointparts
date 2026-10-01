"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { useApp } from "@/components/layout/AppProvider";
import { OfferList } from "@/components/OfferList";
import { PageHeader } from "@/components/PageHeader";
import { PartMeta } from "@/components/PartCard";
import { Button, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { friendlyError } from "@/lib/errors";
import { useQuery } from "@/lib/hooks/use-query";
import { deleteOffer, listOffersForPart } from "@/lib/queries/offers";
import { deletePart, getPart } from "@/lib/queries/parts";
import { listSupplierOptions } from "@/lib/queries/suppliers";
import type { Offer } from "@/lib/types";
import { OfferFormModal } from "./OfferFormModal";
import { PartHistory } from "./PartHistory";

export function PartDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { staleDays } = useApp();
  const part = useQuery(() => getPart(id), [id]);
  const offers = useQuery(() => listOffersForPart(id), [id]);
  const suppliers = useQuery(listSupplierOptions, []);

  const [historyKey, setHistoryKey] = useState(0);
  const [modal, setModal] = useState<{ offer?: Offer } | null>(null);
  const [removing, setRemoving] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (part.error) return <ErrorState message={part.error} onRetry={part.reload} />;
  if (part.data === undefined) return <LoadingState rows={3} />;
  const p = part.data;
  if (!p) return <EmptyState title="Peça não encontrada" action={<LinkButton href="/pecas">Voltar às peças</LinkButton>} />;

  const linked = new Set((offers.data ?? []).map((o) => o.supplier_id));
  const available = (suppliers.data ?? []).filter((s) => !linked.has(s.id));

  function changed() {
    offers.reload();
    setHistoryKey((k) => k + 1);
  }

  async function handleRemoveOffer() {
    if (!removing) return;
    try {
      await deleteOffer(removing.id);
      toast.success("Fornecedor removido da peça");
      setRemoving(null);
      changed();
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function handleDeletePart() {
    try {
      await deletePart(id);
      toast.success("Peça excluída");
      router.replace("/pecas");
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e));
      setDeleting(false);
    }
  }

  const codes = [p.internal_code && `Cód. interno: ${p.internal_code}`, p.manufacturer_code && `Cód. fabricante: ${p.manufacturer_code}`].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back={
          <Link href="/pecas" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="size-4" /> Peças
          </Link>
        }
        title={p.name}
        actions={
          <>
            <LinkButton href={`/pecas/${p.id}/editar`} variant="secondary" icon={<Pencil className="size-4" />}>
              Editar
            </LinkButton>
            <Button variant="secondary" className="text-red-600" onClick={() => setDeleting(true)} icon={<Trash2 className="size-4" />}>
              Excluir
            </Button>
          </>
        }
      />
      <div className="-mt-3 mb-4">
        <PartMeta part={{ ...p, category_name: p.category?.name ?? "" }} />
        {(codes.length > 0 || !p.active) && (
          <p className="mt-1 text-xs text-slate-500">
            {!p.active && <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 font-medium">Inativa</span>}
            {codes.join(" · ")}
          </p>
        )}
        {p.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{p.notes}</p>}
      </div>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Fornecedores</h2>
          <Button onClick={() => setModal({})} icon={<Plus className="size-4" />} disabled={!suppliers.data}>
            Adicionar fornecedor
          </Button>
        </div>
        {offers.error ? (
          <ErrorState message={offers.error} onRetry={offers.reload} />
        ) : !offers.data ? (
          <LoadingState rows={3} label="Carregando fornecedores" />
        ) : (
          <OfferList offers={offers.data} staleDays={staleDays} manage={{ onChanged: changed, onEditDetails: (offer) => setModal({ offer }), onRemove: setRemoving }} />
        )}
        <p className="mt-2 text-xs text-slate-500">
          Use <strong>Editar</strong> para alterar preço e disponibilidade rapidamente; a data e a hora da atualização são registradas ao salvar.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">Histórico de preços</h2>
        <PartHistory partId={id} refreshKey={historyKey} />
      </section>

      <OfferFormModal
        open={modal !== null}
        partId={id}
        offer={modal?.offer}
        suppliers={available}
        onClose={() => setModal(null)}
        onSaved={changed}
      />

      <ConfirmDialog
        open={removing !== null}
        title="Remover fornecedor desta peça?"
        description={
          <>
            O vínculo com <strong>{removing?.supplier.name}</strong> será removido. O histórico de preços já registrado é mantido.
          </>
        }
        confirmLabel="Remover"
        onConfirm={handleRemoveOffer}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        open={deleting}
        title="Excluir peça?"
        description={
          <>
            <strong>{p.name}</strong>, todos os preços dos fornecedores e o histórico de preços serão excluídos. Esta ação não pode ser desfeita. Para apenas
            ocultá-la, edite a peça e desmarque <em>ativa</em>.
          </>
        }
        onConfirm={handleDeletePart}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}
