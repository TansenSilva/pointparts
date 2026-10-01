import { SupplierDetail } from "@/features/suppliers/SupplierDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierDetail id={id} />;
}
