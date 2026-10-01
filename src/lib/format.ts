const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return brl.format(value).replace(/ /g, " ");
}

/** Converte texto digitado ("1.349,90", "R$ 349", "349.9") em número. */
export function parsePrice(input: string): number | null {
  let s = input.replace(/[^\d.,]/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  } else if (/^\d{1,3}\.\d{3}$/.test(s)) {
    s = s.replace(".", "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/** Valor para preencher um campo de preço ("349,00"). */
export function priceToInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toFixed(2).replace(".", ",");
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Diferença em dias de calendário (hoje = 0, ontem = 1). */
export function daysSince(iso: string, now: Date = new Date()): number {
  const diff = startOfDay(now) - startOfDay(new Date(iso));
  return Math.max(0, Math.round(diff / 86_400_000));
}

export function formatRelativeDate(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "Nunca";
  const days = daysSince(iso, now);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 60) return `Há ${days} dias`;
  if (days < 365) return `Há ${Math.floor(days / 30)} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? "Há 1 ano" : `Há ${years} anos`;
}

/** 01/10/2026 às 15:42 */
export function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Link do WhatsApp (assume Brasil quando o número não traz o DDI). */
export function whatsappUrl(number: string | null | undefined): string | null {
  if (!number) return null;
  let digits = onlyDigits(number);
  if (digits.length < 8) return null;
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}`;
}

/** Garante protocolo em URLs digitadas sem http(s). */
export function normalizeUrl(input: string | null | undefined): string | null {
  const v = input?.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
