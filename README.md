# PointParts

Aplicativo web para **comparar preços de peças de assistência técnica de celulares** entre fornecedores.
Cadastre a peça uma única vez, vincule vários fornecedores (cada um com preço, estoque e data da consulta) e
descubra em segundos **quem tem** e **quem vende mais barato**.

- **Consulta rápida** (`/consulta`, página inicial após o login): digite "tela soft oled iphone 15" e veja o melhor
  fornecedor, o preço, o estoque, a idade do preço e a tabela completa, com botões de WhatsApp / produto / fornecedor.
- Pesquisa tolerante: qualquer ordem das palavras, sem diferenciar maiúsculas/minúsculas **nem acentos**
  (`iphone 15 oled`, `soft 15`, `s23 bateria`, `a54 conector`, códigos de fornecedor…).
- Edição rápida de preço/estoque direto na tabela de fornecedores da peça, com **histórico automático** de preços.
- Indicador de **preço possivelmente desatualizado** (configurável, padrão 15 dias).
- Cadastro rápido de peça + fornecedores/preços numa única transação e aviso de **peças semelhantes**.

## Tecnologias

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Auth + PostgreSQL + RLS) · Zod · Vercel.

## Pré-requisitos

- Node.js 20.9 ou superior (testado com 22) e npm
- Uma conta gratuita no [Supabase](https://supabase.com)
- (Para publicar) contas na [Vercel](https://vercel.com) e no GitHub

## Como instalar e rodar localmente

```bash
git clone <url-do-repositorio> pointparts
cd pointparts
npm install
cp .env.example .env.local      # depois preencha as 2 variáveis (veja abaixo)
npm run dev                     # http://localhost:3000
```

Antes do primeiro `npm run dev`, crie o projeto no Supabase e rode as migrations (próximas seções).
Se as variáveis não estiverem configuradas, o app mostra a página `/setup` explicando o que falta.

## Variáveis de ambiente

| Variável | Onde achar | Observação |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → *Project URL* | pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → chave `anon` (ou *publishable*) | pública; protegida pelo RLS |

> ⚠️ **Nunca** use a chave `service_role` neste projeto (nem em variáveis `NEXT_PUBLIC_*`). O app só precisa da chave anon:
> toda a segurança é feita por Row Level Security no banco.

`.env.local` não é versionado (está no `.gitignore`). O arquivo `.env.example` não contém credenciais reais.

## Como criar o projeto no Supabase

1. Em [supabase.com](https://supabase.com) → **New project** (escolha região próxima, ex.: *South America (São Paulo)*, e guarde a senha do banco).
2. Em **Authentication → Providers**, mantenha *Email* habilitado. Como o sistema é interno, recomendamos
   **desligar "Allow new users to sign up"** (Authentication → Sign In / Providers → *User Signups*).
3. Crie o usuário administrador em **Authentication → Users → Add user → Create new user**:
   informe e-mail e senha e marque **Auto Confirm User**.
   - O **primeiro usuário criado vira `admin`** automaticamente (tabela `profiles`). Os demais entram como `user`.
4. Copie *Project URL* e a chave *anon* para o `.env.local`.

## Como executar as migrations

As migrations estão em `supabase/migrations/` e devem rodar **nesta ordem**:

| # | Arquivo | O que faz |
| --- | --- | --- |
| 1 | `20260101000001_schema.sql` | Extensões (`pg_trgm`, `unaccent`), tabelas, índices, triggers (histórico de preços, `search_text`, `updated_at`), categorias e configuração iniciais |
| 2 | `20260101000002_rls.sql` | Ativa RLS em todas as tabelas e cria as políticas |
| 3 | `20260101000003_functions.sql` | Pesquisa (`search_parts`), peças semelhantes, cadastro rápido, dashboard e view de histórico |
| – | `supabase/seed.sql` | *(opcional)* dados de exemplo — fornecedores Alfa/Beta/Gama/Delta, Tela Soft OLED iPhone 15, Bateria iPhone 13, Tela Incell iPhone 11, Conector de carga Galaxy A54, Tela OLED Galaxy S23… |

**Opção A — SQL Editor (mais simples):** no painel do Supabase abra **SQL Editor → New query**, cole o conteúdo de cada
arquivo, na ordem acima, e clique em **Run**. Rode o `seed.sql` por último se quiser os dados de exemplo
(ele pode ser executado mais de uma vez sem duplicar).

**Opção B — Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push                 # aplica supabase/migrations
# seed (opcional): cole supabase/seed.sql no SQL Editor, ou use psql com a string de conexão do projeto
```

## Como publicar na Vercel

1. Suba o código para um repositório no GitHub (`git push`).
2. Na Vercel: **Add New → Project → Import** o repositório (framework detectado: Next.js; comandos padrão).
3. Em **Environment Variables**, cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Production, Preview e Development).
4. **Deploy**. A cada `git push` na branch principal a Vercel publica automaticamente.
5. Abra a URL, entre com o usuário criado no Supabase e, no celular, use *Adicionar à tela inicial* (PWA).

Não é necessário configurar URLs de redirecionamento no Supabase, pois o login é por e-mail e senha.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e execução de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | testes unitários (Vitest): formatação, preço, ranking de melhor oferta |

## Estrutura do projeto

```
supabase/
  migrations/           # SQL: schema, RLS, funções
  seed.sql              # dados de exemplo
src/
  proxy.ts              # renova sessão e exige login nas rotas internas (Next 16: antigo "middleware")
  app/
    (auth)/login        # login (Supabase Auth)
    (app)/              # rotas protegidas: consulta, dashboard, pesquisar, pecas, fornecedores, historico, configuracoes
    manifest.ts         # PWA manifest
  features/             # telas por domínio (search, parts, suppliers, history, settings, dashboard)
  components/           # SearchBar, PartCard, SupplierCard, OfferList, PriceBadge, AvailabilityBadge,
                        # LastUpdatedBadge, DataTable, ConfirmDialog, EmptyState, LoadingState, PageHeader, FormField…
    layout/             # shell (sidebar no desktop, barra inferior + drawer no celular)
  lib/
    supabase/           # clientes browser/server
    queries/            # acesso ao banco (um arquivo por tabela/área)
    validation.ts       # schemas Zod
    format.ts offers.ts # moeda, datas, WhatsApp, ranking de "melhor preço"
```

## Decisões de projeto

### Modelo de dados
`parts` (peça) ←→ `supplier_parts` (oferta: preço `numeric(12,2)`, estoque, `checked_at`) ←→ `suppliers`, com
`unique(part_id, supplier_id)` (a mesma combinação peça + fornecedor não se repete). Valores monetários **nunca** usam float.
`price_history` guarda `old_price`, `new_price` e data/hora (`created_at`) de cada mudança, com `part_id`/`supplier_id`
denormalizados — pronto para gráficos futuros sem joins. O histórico é gravado por **trigger** (o app não consegue
forjar nem apagar registros) e **não é apagado** ao remover o vínculo fornecedor↔peça.

### Pesquisa (PostgreSQL)
Vale usar recursos do Postgres, e foi o que se fez: cada peça tem uma coluna `search_text` (mantida por triggers)
com nome, categoria, marca, modelo, tecnologia, qualidade, código interno, código do fabricante e códigos dos
fornecedores, normalizada com `unaccent` + minúsculas. A função `search_parts` exige que **cada palavra** digitada
apareça no texto (`LIKE '%palavra%'`, qualquer ordem), com índice **GIN `pg_trgm`** para acelerar. Isso entrega
exatamente o comportamento pedido (`iphone 15 oled`, `s23 bateria`) e é mais previsível para códigos/modelos do que
o *full-text search* (`tsvector`), cujo stemming e stop-words atrapalham termos como "A54" ou "15 pro max".
A mesma função aplica filtros, ordenação, paginação e já devolve o melhor preço (1 chamada por tela).

### Melhor preço
Entre fornecedores **ativos**, vale o menor preço dentre os **Em estoque**. Se ninguém tiver estoque, considera
*Sob consulta/Não informado* e, por último, *Sem estoque* (a interface avisa "sem estoque confirmado").
A regra existe em SQL (`search_parts`) e em TypeScript (`src/lib/offers.ts`, com testes) para a lista e o detalhe
mostrarem sempre o mesmo resultado.

### Duplicidade
Banco: `unique(part_id, supplier_id)`. Cadastro de peça: `find_similar_parts` compara as palavras do nome
(independe da ordem; números de modelo precisam coincidir — "S23" ≠ "S24"). Se houver semelhança, o formulário
mostra o aviso e, ao salvar, pergunta *"Encontramos peças semelhantes. Deseja verificar antes de cadastrar?"* —
sem bloquear.

### Segurança
- RLS ativo em todas as tabelas; **anon não lê nada**. Usuários autenticados acessam os dados do sistema;
  `settings` só é alterável por `admin`; `price_history` é somente leitura para o app; um usuário comum não consegue
  promover a si mesmo.
- `src/proxy.ts` valida a sessão (`auth.getUser()`) e redireciona para `/login`; o layout das rotas internas valida de novo no servidor.
- Apenas a chave anon é usada. Nenhuma `service_role` no código.
- Para vários usuários no futuro: a tabela `profiles` (com `role`) já existe; bastará criar novos usuários no
  Supabase Auth e, se quiser regras por papel, trocar as políticas `*_all` por políticas com `is_admin()`.

### PWA
`manifest.webmanifest`, ícones 192/512, `apple-icon` e `theme-color` já estão prontos (instalável na tela inicial).
Service worker/modo offline ficam para uma etapa futura.

### Preparado para o futuro (sem complicar o MVP)
`supplier_parts` e `price_history` aceitam novas colunas (frete, prazo, pedido mínimo, preço de venda, margem…);
`src/lib/queries/` concentra o acesso a dados (ponto único para importar CSV/Excel, atualizações em lote ou APIs);
`profiles.role` suporta vários usuários; `settings` (chave/valor `jsonb`) comporta novas configurações.

## Verificações realizadas

- `npm run lint`, `npm run typecheck`, `npm test` (21 testes) e `npm run build` passam sem erros.
- Migrations + seed executadas em PostgreSQL 16 limpo; testados: pesquisa (ordem livre, acentos, códigos), melhor preço
  com e sem estoque, histórico por trigger, unicidade peça+fornecedor, RLS (anon bloqueado, não-admin sem acesso a
  `settings`, `price_history` somente leitura) e peças semelhantes.
- Fluxo ponta a ponta no navegador (Chromium, desktop 1366px e celular 390px) cobrindo: login/logout e rota protegida,
  criar/editar fornecedor, criar peça com 4 fornecedores, pesquisa parcial, ordenação por menor preço, destaque de
  "MELHOR PREÇO", alteração rápida de preço, histórico do preço anterior, fornecedor sem estoque, filtros, categorias,
  configuração de dias, confirmação de exclusão e ausência de rolagem horizontal no celular.
  > Esses testes ponta a ponta rodaram contra o PostgreSQL real **com um servidor local que imita a API do Supabase**
  > (o ambiente de desenvolvimento não alcança o Supabase). Faça um teste de fumaça no seu projeto real após o deploy
  > (criar peça → pesquisar → alterar preço) e me avise se algo se comportar diferente.
