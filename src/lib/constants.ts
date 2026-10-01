import type { Availability } from "./types";

export const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "in_stock", label: "Em estoque" },
  { value: "out_of_stock", label: "Sem estoque" },
  { value: "on_request", label: "Sob consulta" },
  { value: "unknown", label: "Não informado" },
];

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: "Em estoque",
  out_of_stock: "Sem estoque",
  on_request: "Sob consulta",
  unknown: "Não informado",
};

export const PART_SORT_OPTIONS = [
  { value: "name", label: "Nome" },
  { value: "price_asc", label: "Menor preço" },
  { value: "recent", label: "Atualizado recentemente" },
  { value: "stale", label: "Mais antigo sem atualização" },
] as const;

export type PartSort = (typeof PART_SORT_OPTIONS)[number]["value"] | "relevance";

export const DEFAULT_STALE_DAYS = 15;
export const PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

/** Sugestões de tecnologia/qualidade (campos continuam livres). */
export const TECHNOLOGY_SUGGESTIONS = ["Soft OLED", "Hard OLED", "OLED", "Incell", "LCD", "AMOLED", "Original"];
export const QUALITY_SUGGESTIONS = ["Original", "Premium", "Standard", "Paralela"];
