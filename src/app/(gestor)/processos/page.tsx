import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewProcessDialog } from "@/components/processes/new-process-dialog";
import { ProcessDeleteButton } from "@/components/processes/process-delete-button";
import { ProcessFilters } from "@/components/processes/process-filters";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { ProcessPriority, ProcessStatus, Wave } from "@/generated/prisma/client";
import { PROCESS_PRIORITY_STYLE, PROCESS_STATUS_STYLE } from "@/lib/badges";
import { WAVE_LABEL } from "@/lib/domain";
import { listAreasForForm } from "@/lib/queries/atlas";
import { listProcesses } from "@/lib/queries/processes";

export const metadata: Metadata = { title: "Processos" };

const PAGE_SIZE = 20;

interface ProcessesPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ProcessesPage({ searchParams }: ProcessesPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [areas, { items: processes, total }] = await Promise.all([
    listAreasForForm(),
    listProcesses({
      q: params.q,
      areaId: params.areaId,
      status: params.status as ProcessStatus | undefined,
      priority: params.priority as ProcessPriority | undefined,
      wave: params.wave as Wave | undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseQuery = Object.fromEntries(
    Object.entries(params).filter(([key, value]) => key !== "page" && value),
  );
  const pageHref = (target: number) => ({
    pathname: "/processos" as const,
    query: { ...baseQuery, page: String(target) },
  });

  return (
    <div className="container-page space-y-8 pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="label-caps">Gestão</p>
          <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">Processos</h1>
          <p className="text-sm text-muted-foreground">
            Crie um processo do zero ou edite as perguntas de um já existente.
          </p>
        </div>
        <NewProcessDialog areas={areas} />
      </header>

      <ProcessFilters areas={areas} />

      <section className="surface-panel divide-y divide-border">
        {processes.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum processo encontrado com esses filtros.
          </p>
        ) : (
          processes.map((processItem) => (
            <div
              key={processItem.id}
              className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-accent/40"
            >
              <Link
                href={`/processos/${processItem.id}`}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
              >
                <span className="font-mono text-[0.6875rem] tracking-widest text-brand">
                  {processItem.code}
                </span>
                <span className="text-xs text-muted-foreground">{processItem.area.name}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{processItem.name}</span>
                <span className="text-xs text-muted-foreground">
                  {WAVE_LABEL[processItem.wave]}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {processItem._count.questions} pergunta(s)
                </span>
                <Badge className={PROCESS_PRIORITY_STYLE[processItem.priority].className}>
                  {PROCESS_PRIORITY_STYLE[processItem.priority].label}
                </Badge>
                <Badge className={PROCESS_STATUS_STYLE[processItem.status].className}>
                  {PROCESS_STATUS_STYLE[processItem.status].label}
                </Badge>
              </Link>
              <Link
                href={`/administracao/processos/${processItem.id}`}
                aria-label={`Editar estrutura e roteiro de ${processItem.name}`}
                className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              >
                <Pencil />
              </Link>
              <ProcessDeleteButton id={processItem.id} name={processItem.name} />
            </div>
          ))
        )}
      </section>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Página {page} de {totalPages} — {total} processo(s)
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Próxima
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
