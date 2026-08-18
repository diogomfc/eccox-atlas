# ECCOX Atlas

O mapa vivo da operação ECCOX.

O Atlas entrevista cada área da empresa e transforma a conversa em artefatos
oficiais de governança: o **Processo (POP)** no modelo V3, a **Política (POL)**
no modelo V4, o comparativo de fluxo **Hoje × Com IA** e o diagnóstico da IA
sobre a área.

Nasce com o catálogo do board já dentro: 19 áreas, 79 processos e 23 políticas
priorizados em ondas, importados da planilha `PROCESSOS - V6 FINAL.xlsx`.

## Módulos

| Rota | Módulo | Estado |
| --- | --- | --- |
| `/atlas` | Mapa das 19 áreas, cobertura, ondas e itens críticos | pronto |
| `/atlas/[area]` | Detalhe da área: scores médios, ondas e catálogo de artefatos | pronto |
| `/entrevista/[token]` | Entrevista adaptativa, pública por token | Fase 2 |
| `/codice/[id]` | Documento oficial gerado, RACI, fluxo e impacto | Fase 3 e 4 |
| `/sinais` | Diagnóstico agregado da IA por área | Fase 5 |

## Stack

Next 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 CSS-first ·
shadcn/ui · Motion · Prisma 7 + Postgres 16 · Auth.js v5 + Microsoft Entra ID ·
OpenRouter · Biome · pnpm.

## Começar

```bash
docker compose up -d          # Postgres na porta 5435
cp .env.example .env          # gerar AUTH_SECRET, preencher OPENROUTER_API_KEY
pnpm install
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev                      # http://localhost:3004
```

Sem credenciais do Entra ID, mantenha `NEXT_PUBLIC_AUTH_ENTRA_ENABLED=false`:
o login oferece utilizadores de desenvolvimento.

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento na porta 3004 |
| `pnpm lint` | Biome (formatação + lint) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm build` | Build de produção |
| `pnpm catalog:import` | Relê o xlsx oficial e regenera `prisma/seed/catalog.json` |
| `pnpm db:seed` | Semeia áreas, processos e políticas a partir do catálogo |
| `pnpm db:studio` | Prisma Studio |

Convenções e decisões de arquitetura: ver [`CLAUDE.md`](CLAUDE.md).
