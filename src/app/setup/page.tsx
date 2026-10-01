export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-semibold">Configuração necessária</h1>
      <p className="mt-2 text-slate-600">
        As variáveis de ambiente do Supabase não foram encontradas. Crie o arquivo <code className="rounded bg-slate-200 px-1">.env.local</code> a
        partir de <code className="rounded bg-slate-200 px-1">.env.example</code> e reinicie o servidor:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
        {`NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon`}
      </pre>
      <p className="mt-4 text-sm text-slate-500">Na Vercel, cadastre as mesmas variáveis em Project Settings → Environment Variables.</p>
    </main>
  );
}
