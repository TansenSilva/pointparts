"use client";

import { Gauge } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormField, Input } from "@/components/FormField";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(/invalid login/i.test(error.message) ? "E-mail ou senha incorretos." : "Não foi possível entrar. Tente novamente.");
      setLoading(false);
      return;
    }
    router.replace("/consulta");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Gauge className="size-8" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">PointParts</h1>
            <p className="text-sm text-slate-500">Comparador de preços de peças</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <FormField label="E-mail" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Senha" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
