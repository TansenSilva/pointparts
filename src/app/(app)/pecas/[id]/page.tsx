import { PartDetail } from "@/features/parts/PartDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartDetail id={id} />;
}
