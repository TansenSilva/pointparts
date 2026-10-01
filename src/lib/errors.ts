interface ErrorLike {
  message?: string;
  code?: string;
  details?: string;
}

/** Converte erros do Supabase/PostgREST em mensagens amigáveis em português. */
export function friendlyError(error: unknown): string {
  const e = (error ?? {}) as ErrorLike;
  const text = `${e.message ?? ""} ${e.details ?? ""}`;
  switch (e.code) {
    case "23505":
      if (text.includes("supplier_parts_part_supplier_unique")) return "Este fornecedor já está vinculado a esta peça.";
      if (text.includes("suppliers_name_unique")) return "Já existe um fornecedor com este nome.";
      if (text.includes("categories_name_unique")) return "Já existe uma categoria com este nome.";
      return "Já existe um registro com estes dados.";
    case "23503":
      return "Este registro está em uso e não pode ser removido.";
    case "42501":
      return "Você não tem permissão para esta ação.";
    case "PGRST301":
    case "401":
      return "Sua sessão expirou. Entre novamente.";
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(text)) return "Sem conexão com o servidor. Verifique sua internet.";
  return e.message || "Ocorreu um erro inesperado. Tente novamente.";
}
