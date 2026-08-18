# ECCOX Atlas — contexto para agentes

Plataforma interna de governança da ECCOX, focada só em **Processo (POP, modelo
oficial V3)**. Política saiu do produto no pivô de 2026-08-15 — ver
`docs/PLANO.md` (histórico) e o plano em
`~/.claude/plans/seguinte-tenho-o-projeto-playful-starfish.md` para o raciocínio
completo por trás das decisões.

## O que este projeto é

O gestor cadastra um processo, monta o roteiro de perguntas (Objetivo,
Responsável, Ferramentas, Passos) e convida um colaborador — escolhido numa
lista de quem já logou no Atlas, ou por e-mail. O colaborador responde num
formulário determinístico, um campo por vez, com um botão opcional "Melhorar
com IA" por campo de texto. Ao enviar, gera-se automaticamente o documento no
modelo oficial (montagem direta das respostas, sem IA) e o desenho do processo
(seção 5, derivado dos Passos). O gestor aprova ou solicita revisão com
comentário; aprovado, o documento vira `.docx` fiel ao modelo e pode ser
impresso em PDF.

## Papéis

**GESTOR** (acesso total: `/atlas`, `/processos`, `/entrevistas`,
`/administracao/usuarios`) e **COLABORADOR** (só `/minhas-entrevistas` e o link
da própria entrevista). Bootstrap: o primeiro usuário a logar vira GESTOR
automaticamente; `ATLAS_ROOT_EMAILS` no `.env` força GESTOR sempre, mesmo que
alguém seja rebaixado por engano. Trocas de papel depois disso passam pela tela
de administração.

## Decisões fechadas (não reabrir sem o utilizador pedir)

| Tema | Decisão |
| --- | --- |
| Stack | Next 16 App Router, React 19, TypeScript strict, Tailwind v4 CSS-first, Prisma 7 + `@prisma/adapter-pg` + Postgres 16, Biome, pnpm |
| UI | shadcn/ui (estilo `base-nova`, base `neutral`, ícones Lucide) via `pnpm dlx shadcn@latest add` |
| Tema | `:root` = claro, `.dark` = escuro, mas `defaultTheme="dark"` — dark-first |
| Animação | `motion` (Motion for React). Sem GSAP, sem Three.js/R3F |
| IA na entrevista | **Nenhuma.** Formulário determinístico lendo `ProcessQuestion` do banco. Só "Melhorar com IA" por campo de texto livre (opt-in) e o parecer de doutrina do ECI na revisão (opcional, texto livre) |
| Auth | Auth.js v5 + Microsoft Entra ID real (`NEXT_PUBLIC_AUTH_ENTRA_ENABLED=true`), provider `id: "microsoft"`. Login mock convive em dev (`NODE_ENV !== "production"`), some em produção |
| Diretório completo do Entra | Atrás de `NEXT_PUBLIC_ENTRA_DIRECTORY_ENABLED` — precisa do escopo `User.Read.All` com consentimento de admin do tenant. **Nunca ligar sem confirmar o consentimento primeiro** — pedir o escopo sem consentimento trava o login inteiro |
| Portas | App **3000**, Postgres **5435**. O Redirect URI do Entra ID só está homologado pra porta 3000 (mesmo App Registration do `eci-studio-frontend`) — **não dá pra rodar os dois projetos ao mesmo tempo** sem o TI cadastrar um novo Redirect URI. Cookies de sessão do Auth.js não são isolados por porta no `localhost`; se trocar de projeto na mesma porta, limpe os cookies antes de testar login |

## Regras de trabalho

- **Biome, nunca ESLint ou Prettier.** `pnpm lint` após qualquer alteração.
- **pnpm**, nunca npm ou yarn.
- Tailwind v4 é CSS-first: tudo em `src/app/globals.css`. **Sem `tailwind.config.ts`.**
- Sem hex arbitrário em classe utilitária — só token semântico.
- Server Components por defeito; `"use client"` só nas folhas interativas.
- TypeScript strict; `any` proibido.
- pt-BR na interface; identificadores de código em inglês.
- Prisma 7: connection string em `prisma.config.ts`, adapter em `src/lib/db.ts`.
- **JWT do Auth.js**: o tipo `JWT` real usado no callback `jwt` vem de
  `@auth/core/jwt`, um pacote transitivo que o pnpm não expõe ao projeto —
  `declare module` não alcança esse tipo. `src/auth.ts` faz
  `token as typeof token & AtlasTokenFields` (ver `src/types/next-auth.d.ts`)
  em vez de confiar em augmentation. Não tentar "consertar" isso com
  `declare module "@auth/core/jwt"` — não resolve, já tentado.
- Reordenar `ProcessQuestion.order` sempre em 3 passos (valor temporário
  primeiro) — a coluna tem `@@unique([processId, section, order])`, um swap
  direto colide mesmo dentro de uma transação.

## Modelo de dados

`User` (papel + `entraOid`, upsert só no login) → `Area` → `Process` →
`ProcessQuestion` (roteiro configurável por seção) → `InterviewLink` →
`Interview` (`RASCUNHO → ENVIADA → APROVADA`, ou `EM_REVISAO` de volta) →
`InterviewAnswer` (uma linha por pergunta respondida) → `Review` (decisão do
gestor) → `Document` (versionado, `isDraft` até aprovar) → `FlowGraph` (seção
5, gerado dos Passos via `src/lib/documents/flow.ts`, sem IA).

Convite a alguém que nunca logou cria um `User` com `entraOid = "pending:<email>"`
(`src/lib/auth/pending-user.ts`); no primeiro login real, `provisionUser`
reconcilia pelo e-mail em vez de duplicar.

## Camada de IA

Ver `docs/ARQUITETURA-IA.md` — ECI é dono da doutrina (parecer opcional,
texto livre), Atlas é dono do contrato. `src/lib/ai/gateway.ts` tem três
métodos: `improveText` (sempre OpenRouter), `reviewAgainstDoctrine` (ECI se
configurado, senão `null`), e `suggestAiFirstAnalysis` (sempre OpenRouter,
saída estruturada por schema Zod — fluxo redesenhado + ROI + matriz de
papéis + o que morre + loop de aprendizado + plano de ondas; disparado só
por ação explícita do gestor em processo aprovado, nunca automático). Os
números de ROI (h/mês, R$/mês, R$/ano) são calculados em código a partir das
premissas que a IA estima — nunca aritmética do modelo (`src/lib/documents/ai-first-analysis.ts`).

## Exportação

DOCX construído programaticamente com a lib `docx` (`src/lib/export/docx.ts`)
— replica cabeçalho e seções do modelo oficial, mas não é uma cópia literal do
`.docx` real (fidelidade de conteúdo e estrutura, não de tipografia/branding
pixel a pixel). PDF é a página de leitura com CSS de impressão
(`@media print` em `globals.css`) + `window.print()`.

## Fontes oficiais

`docs/Modelo de Processo POP ECCOX - V3.docx` — estrutura de referência.
`docs/PROCESSOS - V6 FINAL.xlsx` — catálogo original (aba PROCESSOS só; aba
POLÍTICAS não é mais importada). `pnpm catalog:import` regenera
`prisma/seed/catalog.json`; `pnpm db:seed` aplica o catálogo + o roteiro padrão
de perguntas (`src/lib/process-templates/default-questions.ts`) a cada
processo novo.

## Setup local

```bash
docker compose up -d
cp .env.example .env    # preencher AUTH_SECRET, OPENROUTER_API_KEY, ATLAS_ROOT_EMAILS
pnpm install
pnpm db:generate && pnpm db:push
pnpm catalog:import && pnpm db:seed
pnpm dev                # porta 3000 — pare o eci-studio-frontend antes, mesma porta
```
