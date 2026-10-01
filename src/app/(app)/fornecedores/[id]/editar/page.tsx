import { SupplierEditPage } from "@/features/suppliers/SupplierEditPage";

export const metadata = { title: "Editar fornecedor" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierEditPage id={id} />;
}
