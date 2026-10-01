"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Input } from "@/components/FormField";
import { ErrorState, LoadingState } from "@/components/LoadingState";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { friendlyError } from "@/lib/errors";
import { useQuery } from "@/lib/hooks/use-query";
import { createCategory, deleteCategory, listCategories, updateCategory } from "@/lib/queries/categories";
import type { Category } from "@/lib/types";
import { categorySchema } from "@/lib/validation";

export function CategoriesManager() {
  const toast = useToast();
  const { data, error, reload } = useQuery(listCategories, []);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);

  async function run(fn: () => Promise<unknown>, success: string) {
    try {
      await fn();
      toast.success(success);
      reload();
      return true;
    } catch (e) {
      toast.error(friendlyError(e));
      return false;
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) return setNameError(parsed.error.issues[0]?.message);
    setNameError(undefined);
    setAdding(true);
    if (await run(() => createCategory(parsed.data.name), "Categoria criada")) setName("");
    setAdding(false);
  }

  async function saveEdit() {
    if (!editing) return;
    const parsed = categorySchema.safeParse({ name: editing.name });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Nome inválido");
    if (await run(() => updateCategory(editing.id, { name: parsed.data.name }), "Categoria renomeada")) setEditing(null);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <h2 className="text-base font-semibold">Categorias de peças</h2>
      <p className="mb-3 text-sm text-slate-500">Categorias desativadas não aparecem no cadastro de novas peças.</p>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2" noValidate>
        <div className="flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria..." aria-label="Nova categoria" aria-invalid={!!nameError} />
          {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
        </div>
        <Button type="submit" loading={adding} icon={<Plus className="size-4" />}>
          Adicionar
        </Button>
      </form>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingState rows={3} />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {data.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editing?.id === c.id ? (
                <>
                  <Input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveEdit();
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="h-9 flex-1"
                    aria-label="Nome da categoria"
                  />
                  <Button size="sm" variant="success" onClick={saveEdit} aria-label="Salvar"><Check className="size-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancelar"><X className="size-4" /></Button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${c.active ? "" : "text-slate-400 line-through"}`}>{c.name}</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-600"
                      checked={c.active}
                      onChange={(e) => void run(() => updateCategory(c.id, { active: e.target.checked }), e.target.checked ? "Categoria ativada" : "Categoria desativada")}
                    />
                    Ativa
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name })} aria-label={`Renomear ${c.name}`}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setRemoving(c)} aria-label={`Excluir ${c.name}`}><Trash2 className="size-4" /></Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Excluir categoria?"
        description={<>A categoria <strong>{removing?.name}</strong> será excluída. Se houver peças usando-a, a exclusão é bloqueada — nesse caso, desative a categoria.</>}
        onConfirm={async () => {
          if (removing) await run(() => deleteCategory(removing.id), "Categoria excluída");
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
