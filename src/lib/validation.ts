import { z } from "zod";
import { normalizeUrl, onlyDigits, parsePrice } from "./format";

export type FieldErrors = Record<string, string>;

/** Converte o resultado do Zod em { campo: mensagem }. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const optionalUrl = z
  .string()
  .trim()
  .transform((v) => normalizeUrl(v))
  .refine((v) => v === null || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), "Informe um endereço válido");

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || onlyDigits(v).length >= 8, "Número inválido")
  .transform((v) => (v === "" ? null : v));

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do fornecedor"),
  contact_name: optionalText,
  whatsapp: optionalPhone,
  phone: optionalPhone,
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "E-mail inválido")
    .transform((v) => (v === "" ? null : v)),
  website: optionalUrl,
  site_login: optionalText,
  notes: optionalText,
  active: z.boolean(),
});
export type SupplierInput = z.output<typeof supplierSchema>;

export const partSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da peça"),
  category_id: z.string().min(1, "Escolha uma categoria"),
  brand: optionalText,
  device_model: optionalText,
  technology: optionalText,
  quality: optionalText,
  internal_code: optionalText,
  manufacturer_code: optionalText,
  notes: optionalText,
  active: z.boolean(),
});
export type PartInput = z.output<typeof partSchema>;

const price = z
  .string()
  .trim()
  .min(1, "Informe o preço")
  .transform((v, ctx) => {
    const n = parsePrice(v);
    if (n === null || n < 0) {
      ctx.addIssue({ code: "custom", message: "Preço inválido" });
      return z.NEVER;
    }
    if (n >= 10_000_000) {
      ctx.addIssue({ code: "custom", message: "Preço muito alto" });
      return z.NEVER;
    }
    return n;
  });

export const availabilitySchema = z.enum(["in_stock", "out_of_stock", "on_request", "unknown"]);

export const offerSchema = z.object({
  supplier_id: z.string().min(1, "Escolha o fornecedor"),
  price,
  availability: availabilitySchema,
  supplier_code: optionalText,
  product_url: optionalUrl,
  notes: optionalText,
});
export type OfferInput = z.output<typeof offerSchema>;

/** Edição rápida: só preço e disponibilidade. */
export const quickOfferSchema = z.object({ price, availability: availabilitySchema });

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da categoria").max(60, "Nome muito longo"),
});

export const staleDaysSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Informe um número inteiro")
  .transform(Number)
  .refine((n) => n >= 1 && n <= 365, "Use um valor entre 1 e 365");
