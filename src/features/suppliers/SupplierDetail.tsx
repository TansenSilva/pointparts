"use client";

import Link from "next/link";
import { ArrowLeft, Globe, Mail, MessageCircle, Pencil, Phone, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { useApp } from "@/components/layout/AppProvider";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { PriceBadge } from "@/components/PriceBadge";
import { PriceChange } from "@/components/PriceChange";
import { SearchBar } from "@/components/SearchBar";
import { SupplierStatusBadge } from "@/components/SupplierCard";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { Button, ExternalButton, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { PAGE_SIZE } from "@/lib/constants";
import { friendlyError } from "@/lib/errors";
import { formatFullDate, whatsappUrl } from "@/lib/format";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useQuery } from "@/lib/hooks/use-query";
import { listPriceHistory } from "@/lib/queries/history";
import { listOffersForSupplier, type SupplierCatalogRow } from "@/lib/queries/offers";
import { deleteSupplier, getSupplier } from "@/lib/queries/suppliers";

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

export function SupplierDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { staleDays } = useApp();
  const supplier = useQuery(() => getSupplier(id), [id]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q, 300);
  const catalog = useQuery(() => listOffersForSupplier(id, debounced, page), [id, debounced, page]);
  const history = useQuery(() => listPriceHistory({ supplierId: id, pageSize: 5 }), [id]);
  const [confirming, setConfirming] = useState(false);

  if (supplier.error) return <ErrorState message={supplier.error} onRetry={supplier.reload} />;
  if (!supplier.data && supplier.loading) return <LoadingState rows={3} />;
  const s = supplier.data;
  if (!s) return <EmptyState title="Fornecedor não encontrado" action={<LinkButton href="/fornecedores">Voltar</LinkButton>} />;

  const wa = whatsappUrl(s.whatsapp);
  const totalParts = catalog.data && !debounced ? catalog.data.total : undefined;

  async function handleDelete() {
    try {
      await deleteSupplier(id);
      toast.success("Fornecedor excluído");
      router.replace("/fornecedores");
      router.refresh();
    } catch (e) {
      toast.error(friendlyError(e));
      setConfirming(false);
    }
  }

  const columns: Column<SupplierCatalogRow>[] = [
    { key: "part", header: "Peça", cell: (r) => r.parts.name },
    { key: "cat", header: "Categoria", cell: (r) => r.parts.category?.name ?? "—" },
    { key: "price", header: "Preço", cell: (r) => <PriceBadge value={r.price} size="sm" /> },
    { key: "av", header: "Estoque", cell: (r) => <AvailabilityBadge value={r.availability} /> },
    { key: "upd", header: "Atualizado", cell: (r) => <LastUpdatedBadge checkedAt={r.checked_at} staleDays={staleDays} showWarning={false} /> },
    {
      key: "links",
      header: "",
      align: "right",
      cell: (r) =>
        r.product_url ? (
          <a href={r.product_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-700 hover:underline">
            Abrir produto
          </a>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        back={
          <Link href="/fornecedores" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800">
            <ArrowLeft className="size-4" /> Fornecedores
          </Link>
        }
        title={s.name}
        actions={
          <>
            {wa && (
              <ExternalButton href={wa} variant="success" icon={<MessageCircle className="size-4" />}>
                WhatsApp
              </ExternalButton>
            )}
            <LinkButton href={`/fornecedores/${s.id}/editar`} variant="secondary" icon={<Pencil className="size-4" />}>
              Editar
            </LinkButton>
            <Button variant="secondary" className="text-red-600" onClick={() => setConfirming(true)} icon={<Trash2 className="size-4" />}>
              Excluir
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Contato</h2>
            <SupplierStatusBadge active={s.active} />
          </div>
          <ul className="space-y-2">
            {s.contact_name && <InfoRow icon={<User className="size-4" />}>{s.contact_name}</InfoRow>}
            {s.whatsapp && <InfoRow icon={<MessageCircle className="size-4" />}>{s.whatsapp}</InfoRow>}
            {s.phone && <InfoRow icon={<Phone className="size-4" />}><a href={`tel:${s.phone}`}>{s.phone}</a></InfoRow>}
            {s.email && <InfoRow icon={<Mail className="size-4" />}><a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a></InfoRow>}
            {s.website && (
              <InfoRow icon={<Globe className="size-4" />}>
                <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
                  {s.website.replace(/^https?:\/\//, "")}
                </a>
              </InfoRow>
            )}
            {s.site_login && <InfoRow icon={<User className="size-4" />}>Login do site: <strong>{s.site_login}</strong></InfoRow>}
          </ul>
          {s.notes && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-2.5 text-sm text-slate-600">{s.notes}</p>}
          <p className="mt-3 text-xs text-slate-400">Cadastrado em {formatFullDate(s.created_at)}</p>
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm">
            <strong className="text-lg tabular-nums">{totalParts ?? "–"}</strong> <span className="text-slate-500">peças vinculadas</span>
          </p>
        </section>

        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white">
            <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Últimas alterações de preço</h2>
            {history.error ? (
              <div className="p-3"><ErrorState message={history.error} onRetry={history.reload} /></div>
            ) : !history.data ? (
              <div className="p-3"><LoadingState rows={2} /></div>
            ) : history.data.rows.length === 0 ? (
              <p className="px-4 py-5 text-center text-sm text-slate-500">Nenhuma alteração registrada.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.data.rows.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                    <Link href={`/pecas/${h.part_id}`} className="min-w-0 truncate font-medium hover:text-brand-700">{h.part_name}</Link>
                    <span className="flex items-center gap-3">
                      <PriceChange oldPrice={h.old_price} newPrice={h.new_price} />
                      <PriceBadge value={h.new_price} size="sm" />
                      <span className="text-xs text-slate-400">{formatFullDate(h.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Catálogo de peças</h2>
            <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Filtrar peças deste fornecedor..." className="mb-3" loading={catalog.loading && !!catalog.data} />
            {catalog.error ? (
              <ErrorState message={catalog.error} onRetry={catalog.reload} />
            ) : !catalog.data ? (
              <LoadingState rows={3} />
            ) : catalog.data.rows.length === 0 ? (
              <EmptyState title="Nenhuma peça vinculada" description="Vincule este fornecedor a peças na página de cada peça." />
            ) : (
              <>
                <DataTable
                  columns={columns}
                  rows={catalog.data.rows}
                  rowKey={(r) => r.id}
                  rowHref={(r) => `/pecas/${r.part_id}`}
                  renderCard={(r) => (
                    <Link href={`/pecas/${r.part_id}`} className="block rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 font-medium">{r.parts.name}</p>
                        <PriceBadge value={r.price} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <AvailabilityBadge value={r.availability} />
                        <LastUpdatedBadge checkedAt={r.checked_at} staleDays={staleDays} showWarning={false} />
                      </div>
                    </Link>
                  )}
                />
                <Pagination page={page} pageSize={PAGE_SIZE} total={catalog.data.total} onChange={setPage} />
              </>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Excluir fornecedor?"
        description={
          <>
            <strong>{s.name}</strong> e todos os seus preços e históricos serão removidos das peças. Esta ação não pode ser desfeita. Se
            preferir manter o histórico, marque o fornecedor como <em>inativo</em>.
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
