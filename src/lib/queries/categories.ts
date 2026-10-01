import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import { unwrap } from "./helpers";

export async function listCategories() {
  const res = await createClient().from("categories").select("*").order("name");
  return unwrap<Category[]>(res);
}

export async function createCategory(name: string) {
  const res = await createClient().from("categories").insert({ name: name.trim() }).select().single();
  return unwrap<Category>(res);
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, "name" | "active">>) {
  const res = await createClient().from("categories").update(patch).eq("id", id).select().single();
  return unwrap<Category>(res);
}

export async function deleteCategory(id: string) {
  unwrap<null>(await createClient().from("categories").delete().eq("id", id));
}
