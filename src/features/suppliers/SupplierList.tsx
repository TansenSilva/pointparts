"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Select } from "@/components/FormField";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { SupplierCard, SupplierStatusBadge } from "@/components/SupplierCard";
import { LinkButton } from "@/components/ui/Button";
import { PAGE_SIZE } from "@/lib/constants";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useQuery } from "@/lib/hooks/use-query";
import { listSuppliers, type SupplierListParams, type SupplierWithCount } from "@/lib/queries/suppliers";
import { whatsappUrl } from "@/lib/format";

const columns: Column<SupplierWithCount>[] = [
  { key: "name", header: "Fornecedor", cell: (s) => s.name },
  { key: "contact", header: "Contato", cell: (s) => s.contact_name || "—" },
  {
    key: "whatsapp",
    header: "WhatsApp",
    cell: (s) => {
      const url = whatsappUrl(s.whatsapp);
      return url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
          {s.whatsapp}
        </a>
      ) : (
        "—"
      );
    },
  },
  { key: "email", header: "E-mail", cell: (s) => s.email || "—" },
  { key: "count", header: "Peças", align: "right", cell: (s) => s.supplier_parts[0]?.count ?? 0 },
  { key: "status", header: "Status", cell: (s) => <SupplierStatusBadge active={s.active} /> },
];

export function SupplierList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SupplierListParams["status"]>("all");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q, 300);
  const { data, error, loading, reload } = useQuery(() => listSuppliers({ q: debounced, status, page }), [debounced, status, page]);

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        actions={
          <LinkButton href="/fornecedores/novo" icon={<Plus className="size-4" />}>
            Novo fornecedor
          </LinkButton>
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <SearchBar
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Buscar fornecedor..."
          loading={loading && !!data}
          className="flex-1"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SupplierListParams["status"]);
            setPage(1);
          }}
          className="h-11 sm:w-44"
          aria-label="Status"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingState label="Carregando fornecedores" />
      ) : data.rows.length === 0 ? (
        <EmptyState
          title={debounced || status !== "all" ? "Nenhum fornecedor encontrado" : "Nenhum fornecedor cadastrado"}
          action={<LinkButton href="/fornecedores/novo">Cadastrar fornecedor</LinkButton>}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data.rows}
            rowKey={(s) => s.id}
            rowHref={(s) => `/fornecedores/${s.id}`}
            dimmed={(s) => !s.active}
            renderCard={(s) => <SupplierCard supplier={s} partCount={s.supplier_parts[0]?.count ?? 0} />}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
