export interface PartNameParts {
  category?: string | null;
  technology?: string | null;
  model?: string | null;
  quality?: string | null;
}

/** Sugestão de nome: "Tela Soft OLED iPhone 15" (categoria + tecnologia + modelo). */
export function buildPartName({ category, technology, model }: PartNameParts): string {
  return [category, technology, model]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" ");
}
