import { PartEditPage } from "@/features/parts/PartEditPage";

export const metadata = { title: "Editar peça" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartEditPage id={id} />;
}
