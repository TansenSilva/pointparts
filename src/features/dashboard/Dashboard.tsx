"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Package, Store, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState";
import { LastUpdatedBadge } from "@/components/LastUpdatedBadge";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { useApp } from "@/components/layout/AppProvider";
import { PageHeader } from "@/components/PageHeader";
import { PriceBadge } from "@/components/PriceBadge";
import { SearchBar } from "@/components/SearchBar";
import { useQuery } from "@/lib/hooks/use-query";
import { getDashboardStats, listRecentlyUpdated, listStaleOffers, type ActivityRow } from "@/lib/queries/dashboard";

function StatCard({ icon, label, value, href, tone }: { icon: ReactNode; label: string; value: number | undefined; href?: string; tone?: "warn" }) {
  const body = (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 md:p-4">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone === "warn" ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums leading-none">{value ?? "–"}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-tight text-slate-500">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block hover:[&>div]:border-brand-500">{body}</Link> : body;
}

function ActivityList({ title, rows, error, loading, staleDays, empty, onRetry }: {
  title: string;
  rows: ActivityRow[] | undefined;
  error?: string;
  loading: boolean;
  staleDays: number;
  empty: string;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">{title}</h2>
      {error ? (
        <div className="p-3"><ErrorState message={error} onRetry={onRetry} /></div>
      ) : loading && !rows ? (
        <div className="p-3"><LoadingState rows={3} /></div>
      ) : rows && rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows?.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <Link href={`/pecas/${r.part.id}`} className="block truncate text-sm font-medium hover:text-brand-700">{r.part.name}</Link>
                <p className="truncate text-xs text-slate-500">{r.supplier.name}</p>
              </div>
              <div className="shrink-0 text-right">
                <PriceBadge value={r.price} size="sm" />
                <div><LastUpdatedBadge checkedAt={r.checked_at} staleDays={staleDays} showWarning={false} prefix="" /></div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Dashboard() {
  const router = useRouter();
  const { staleDays } = useApp();
  const [q, setQ] = useState("");
  const stats = useQuery(() => getDashboardStats(staleDays), [staleDays]);
  const recent = useQuery(() => listRecentlyUpdated(8), []);
  const stale = useQuery(() => listStaleOffers(staleDays, 8), [staleDays]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dashboard" />
      <SearchBar
        value={q}
        onChange={setQ}
        onSubmit={(v) => router.push(v.trim() ? `/pesquisar?q=${encodeURIComponent(v.trim())}` : "/pesquisar")}
        size="lg"
        autoFocus
      />
      <p className="mt-1.5 text-xs text-slate-500">Ex.: Tela iPhone 15 · Soft OLED 15 Pro · Bateria S23 · Conector A54 — pressione Enter.</p>

      {stats.error ? (
        <div className="mt-5"><ErrorState message={stats.error} onRetry={stats.reload} /></div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard icon={<Package className="size-5" />} label="Peças cadastradas" value={stats.data?.parts} href="/pecas" />
          <StatCard icon={<Store className="size-5" />} label="Fornecedores" value={stats.data?.suppliers} href="/fornecedores" />
          <StatCard icon={<Tag className="size-5" />} label="Ofertas/preços" value={stats.data?.offers} />
          <StatCard icon={<Clock className="size-5" />} label="Atualizados nos últimos 7 dias" value={stats.data?.updated_7d} />
          <StatCard icon={<AlertTriangle className="size-5" />} label={`Preços com mais de ${staleDays} dias`} value={stats.data?.stale} tone="warn" />
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ActivityList title="Preços atualizados recentemente" rows={recent.data} error={recent.error} loading={recent.loading} staleDays={staleDays} empty="Nenhum preço cadastrado ainda." onRetry={recent.reload} />
        <ActivityList title="Preços possivelmente desatualizados" rows={stale.data} error={stale.error} loading={stale.loading} staleDays={staleDays} empty="Tudo em dia! Nenhum preço desatualizado." onRetry={stale.reload} />
      </div>
      {recent.data?.length === 0 && (
        <div className="mt-4"><EmptyState title="Comece cadastrando fornecedores e peças" description="Depois vincule os fornecedores a cada peça com seus preços." /></div>
      )}
    </div>
  );
}
