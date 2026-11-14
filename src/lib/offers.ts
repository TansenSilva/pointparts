import type { Availability, Offer } from "./types";
import { daysSince } from "./format";

/** 0 = em estoque, 1 = sob consulta / não informado, 2 = sem estoque. */
export function availabilityTier(a: Availability): 0 | 1 | 2 {
  if (a === "in_stock") return 0;
  if (a === "out_of_stock") return 2;
  return 1;
}

/** Fornecedores ativos primeiro, depois disponibilidade e menor preço. */
export function sortOffers<T extends Pick<Offer, "price" | "availability" | "checked_at"> & { supplier?: { active: boolean } }>(offers: T[]): T[] {
  return [...offers].sort(
    (a, b) =>
      Number(a.supplier?.active === false) - Number(b.supplier?.active === false) ||
      availabilityTier(a.availability) - availabilityTier(b.availability) ||
      a.price - b.price ||
      b.checked_at.localeCompare(a.checked_at),
  );
}

/**
 * Melhor oferta: fornecedores ativos antes de inativos; entre eles, o menor preço
 * dentre os "em estoque". Se não houver nenhum em estoque, cai para sob consulta /
 * não informado e, por último, sem estoque.
 */
export function pickBestOffer(offers: Offer[]): Offer | null {
  if (offers.length === 0) return null;
  const rank = (o: Offer) => [o.supplier.active ? 0 : 1, availabilityTier(o.availability)] as const;
  return (
    [...offers].sort((a, b) => {
      const [ai, at] = rank(a);
      const [bi, bt] = rank(b);
      return ai - bi || at - bt || a.price - b.price || b.checked_at.localeCompare(a.checked_at);
    })[0] ?? null
  );
}

export function isStale(checkedAt: string, staleDays: number, now: Date = new Date()): boolean {
  return daysSince(checkedAt, now) > staleDays;
}

/** Só destaca para compra ofertas de fornecedores ativos com consulta recente. */
export function pickAvailableOffer(offers: Offer[], staleDays: number, now = new Date()): Offer | null {
  return sortOffers(offers.filter((o) => o.supplier.active && o.availability === "in_stock" && !isStale(o.checked_at, staleDays, now)))[0] ?? null;
}

export interface OfferFilters {
  supplier?: string;
  availability?: string;
  freshOnly?: boolean;
  activeOnly?: boolean;
}

export function filterOffers(offers: Offer[], filters: OfferFilters, staleDays: number, now = new Date()): Offer[] {
  return offers.filter((o) =>
    (!filters.supplier || o.supplier_id === filters.supplier) &&
    (!filters.availability || o.availability === filters.availability) &&
    (!filters.activeOnly || o.supplier.active) &&
    (!filters.freshOnly || !isStale(o.checked_at, staleDays, now))
  );
}
