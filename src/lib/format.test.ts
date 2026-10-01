import { describe, expect, it } from "vitest";
import { formatBRL, formatRelativeDate, normalizeUrl, parsePrice, priceToInput, whatsappUrl } from "./format";

describe("parsePrice", () => {
  it.each([
    ["349", 349],
    ["349,00", 349],
    ["1.349,90", 1349.9],
    ["R$ 349,5", 349.5],
    ["349.90", 349.9],
    ["1.349", 1349],
    ["1.234.567,89", 1234567.89],
  ])("%s -> %s", (input, expected) => expect(parsePrice(input)).toBe(expected));
  it("rejeita vazio e texto", () => {
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("abc")).toBeNull();
  });
});

describe("formatBRL", () => {
  it("formata em real", () => {
    expect(formatBRL(345)).toBe("R$ 345,00");
    expect(formatBRL(1349.9)).toBe("R$ 1.349,90");
    expect(formatBRL(null)).toBe("—");
  });
  it("priceToInput", () => expect(priceToInput(349)).toBe("349,00"));
});

describe("formatRelativeDate", () => {
  const now = new Date(2026, 9, 1, 15, 0);
  it("hoje / ontem / há N dias", () => {
    expect(formatRelativeDate(new Date(2026, 9, 1, 8, 0).toISOString(), now)).toBe("Hoje");
    expect(formatRelativeDate(new Date(2026, 8, 30, 23, 59).toISOString(), now)).toBe("Ontem");
    expect(formatRelativeDate(new Date(2026, 8, 28, 10, 0).toISOString(), now)).toBe("Há 3 dias");
    expect(formatRelativeDate(null, now)).toBe("Nunca");
  });
});

describe("whatsappUrl", () => {
  it("monta o link com DDI do Brasil", () => {
    expect(whatsappUrl("(11) 91234-5678")).toBe("https://wa.me/5511912345678");
    expect(whatsappUrl("+55 11 91234-5678")).toBe("https://wa.me/5511912345678");
    expect(whatsappUrl("")).toBeNull();
    expect(whatsappUrl(null)).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("adiciona https quando falta", () => {
    expect(normalizeUrl("exemplo.com/p")).toBe("https://exemplo.com/p");
    expect(normalizeUrl("http://a.com")).toBe("http://a.com");
    expect(normalizeUrl("  ")).toBeNull();
  });
});
