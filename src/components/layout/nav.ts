import { Gauge, History, LayoutDashboard, Package, Search, Settings, Store, Zap, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na barra inferior do celular. */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/consulta", label: "Consulta rápida", icon: Zap, primary: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pesquisar", label: "Pesquisar peças", icon: Search, primary: true },
  { href: "/pecas", label: "Peças", icon: Package, primary: true },
  { href: "/fornecedores", label: "Fornecedores", icon: Store, primary: true },
  { href: "/historico", label: "Histórico de preços", icon: History },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export const BrandIcon = Gauge;
