import { Suspense } from "react";
import { QuickLookup } from "@/features/search/QuickLookup";

export const metadata = { title: "Consulta rápida" };

export default function Page() {
  return (
    <Suspense>
      <QuickLookup />
    </Suspense>
  );
}
