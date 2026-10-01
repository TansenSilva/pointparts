import type { Availability, Offer } from "./types";
import { daysSince } from "./format";

/** 0 = em estoque, 1 = sob consulta / não informado, 2 = sem estoque. */
export function availabilityTier(a: Availability): 0 | 1 | 2 {
  if (a === "in_stock") return 0;
  if (a === "out_of_stock") return 2;
  return 1;
}

/** Ordenação padrão da comparação: menor preço primeiro. */
export function sortOffers<T extends Pick<Offer, "price" | "availability" | "checked_at">>(offers: T[]): T[] {
  return [...offers].sort(
    (a, b) =>
      a.price - b.price ||
      availabilityTier(a.availability) - availabilityTier(b.availability) ||
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
