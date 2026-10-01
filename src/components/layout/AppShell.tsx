"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "@/components/layout/AppProvider";
import { BrandIcon, NAV_ITEMS } from "@/components/layout/nav";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/consulta" className="flex items-center gap-2 font-semibold text-slate-900">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <BrandIcon className="size-5" aria-hidden />
      </span>
      PointParts
    </Link>
  );
}

function useSignOut() {
  const router = useRouter();
  return async () => {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  };
}

function UserBox({ onSignOut }: { onSignOut: () => void }) {
  const { profile, email, isAdmin } = useApp();
  return (
    <div className="border-t border-slate-200 p-3">
      <p className="truncate text-sm font-medium text-slate-800">{profile?.name || email}</p>
      <p className="truncate text-xs text-slate-500">
        {email} · {isAdmin ? "Administrador" : "Usuário"}
      </p>
      <button onClick={onSignOut} className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600">
        <LogOut className="size-4" aria-hidden /> Sair
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [drawer, setDrawer] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.primary);

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar desktop/tablet */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="px-4 py-4">
          <Brand />
        </div>
        <nav className="flex-1 space-y-0.5 px-2" aria-label="Menu principal">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                isActive(pathname, href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Icon className="size-4.5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <UserBox onSignOut={signOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
          <Brand />
          <button onClick={() => setDrawer(true)} aria-label="Abrir menu" className="rounded-lg p-2 text-slate-700 hover:bg-slate-100">
            <Menu className="size-6" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">{children}</main>
      </div>

      {/* Barra inferior mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegação">
        {primary.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", isActive(pathname, href) ? "text-brand-700" : "text-slate-500")}
          >
            <Icon className="size-5" aria-hidden />
            {label.replace("Pesquisar peças", "Pesquisar").replace("Consulta rápida", "Consulta")}
          </Link>
        ))}
        <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
          <Menu className="size-5" aria-hidden />
          Menu
        </button>
      </nav>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} aria-label="Fechar menu" />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold">Menu</span>
              <button onClick={() => setDrawer(false)} aria-label="Fechar" className="rounded-lg p-2 hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawer(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium",
                    isActive(pathname, href) ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              ))}
            </nav>
            <UserBox onSignOut={signOut} />
          </div>
        </div>
      )}
    </div>
  );
}
