import { describe, expect, it, vi } from "vitest";
import { listOffersForParts } from "./offers";

const { from, range } = vi.hoisted(() => ({ from: vi.fn(), range: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

function setup() {
  const builder = { select: vi.fn(), in: vi.fn(), order: vi.fn(), range };
  builder.select.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  from.mockReturnValue(builder);
}

describe("carregamento completo das ofertas", () => {
  it("não consulta a API quando a pesquisa não retorna peças", async () => {
    from.mockClear();
    expect(await listOffersForParts([])).toEqual({});
    expect(from).not.toHaveBeenCalled();
  });
  it("carrega a próxima página sem perder fornecedores", async () => {
    setup();
    range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, i) => ({ id: `${i}`, part_id: "p" })), error: null })
      .mockResolvedValueOnce({ data: [{ id: "500", part_id: "q" }], error: null });
    const result = await listOffersForParts(["p", "q"]);
    expect(result.p).toHaveLength(500);
    expect(result.q).toHaveLength(1);
    expect(range).toHaveBeenNthCalledWith(1, 0, 499);
    expect(range).toHaveBeenNthCalledWith(2, 500, 999);
  });
  it("expõe erros da API em vez de mostrar uma comparação incompleta", async () => {
    setup();
    range.mockResolvedValueOnce({ data: null, error: { message: "Sem conexão" } });
    await expect(listOffersForParts(["p"])).rejects.toEqual({ message: "Sem conexão" });
  });
});
