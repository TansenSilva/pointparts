import { describe, expect, it } from "vitest";
import { isStale, pickBestOffer, sortOffers } from "./offers";
import type { Availability, Offer } from "./types";

const offer = (name: string, price: number, availability: Availability, active = true): Offer => ({
  id: name,
  part_id: "p",
  supplier_id: name,
  supplier_code: null,
  product_url: null,
  price,
  availability,
  notes: null,
  checked_at: "2026-10-01T10:00:00Z",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  supplier: { id: name, name, whatsapp: null, website: null, active },
});

const alfa = offer("Alfa", 380, "in_stock");
const beta = offer("Beta", 345, "in_stock");
const gama = offer("Gama", 410, "out_of_stock");
const delta = offer("Delta", 355, "in_stock");

describe("ordenação e melhor oferta", () => {
  it("ordena do menor para o maior preço", () => {
    expect(sortOffers([alfa, beta, gama, delta]).map((o) => o.supplier.name)).toEqual(["Beta", "Delta", "Alfa", "Gama"]);
  });
  it("melhor preço = menor preço entre os em estoque", () => {
    expect(pickBestOffer([alfa, beta, gama, delta])?.supplier.name).toBe("Beta");
  });
  it("sem estoque não é o melhor quando há fornecedor com estoque", () => {
    const cheapOut = offer("Barato", 100, "out_of_stock");
    expect(pickBestOffer([cheapOut, alfa])?.supplier.name).toBe("Alfa");
  });
  it("sob consulta vem antes de sem estoque quando ninguém tem estoque", () => {
    const consulta = offer("Consulta", 500, "on_request");
    const out = offer("Sem", 100, "out_of_stock");
    expect(pickBestOffer([out, consulta])?.supplier.name).toBe("Consulta");
  });
  it("se todos estão sem estoque, devolve o menor preço", () => {
    expect(pickBestOffer([offer("A", 50, "out_of_stock"), offer("B", 40, "out_of_stock")])?.supplier.name).toBe("B");
  });
  it("fornecedor inativo só vence se não houver ativo", () => {
    const inativo = offer("Inativo", 10, "in_stock", false);
    expect(pickBestOffer([inativo, alfa])?.supplier.name).toBe("Alfa");
    expect(pickBestOffer([inativo])?.supplier.name).toBe("Inativo");
  });
  it("lista vazia", () => expect(pickBestOffer([])).toBeNull());
});

describe("isStale", () => {
  const now = new Date(2026, 9, 20, 12, 0);
  it("compara em dias de calendário", () => {
    expect(isStale(new Date(2026, 9, 5, 9, 0).toISOString(), 15, now)).toBe(false); // 15 dias
    expect(isStale(new Date(2026, 9, 4, 9, 0).toISOString(), 15, now)).toBe(true); // 16 dias
  });
});
