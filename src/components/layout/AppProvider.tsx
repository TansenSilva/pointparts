"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Profile } from "@/lib/types";

interface AppContextValue {
  profile: Profile | null;
  email: string;
  isAdmin: boolean;
  /** Preço é considerado desatualizado após este número de dias. */
  staleDays: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}
