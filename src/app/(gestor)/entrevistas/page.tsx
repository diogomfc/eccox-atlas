import { AlertCircle, ClipboardList, FileClock, MessageSquareWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { InterviewFilters } from "@/components/interviews/interview-filters";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { InterviewStatus } from "@/generated/prisma/client";
import { INTERVIEW_STATUS_STYLE } from "@/lib/badges";
import { listAreasForForm } from "@/lib/queries/atlas";
import {
  getInterviewDashboardMetrics,
  listAllInterviews,
  listInterviewRespondents,
} from "@/lib/queries/reviews";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrevistas" };

interface EntrevistasPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function EntrevistasPage({ searchParams }: EntrevistasPageProps) {
  const params = await searchParams;

  const [metrics, areas, respondents, interviews] = await Promise.all([
    getInterviewDashboardMetrics(),
    listAreasForForm(),
    listInterviewRespondents(),
    listAllInterviews({
      status: params.status as InterviewStatus | undefined,
      areaId: params.areaId,
      respondentUserId: params.respondentUserId,
      q: params.q,
    }),
  ]);

  return (
    <div className="container-page space-y-8 pt-10">
      <header className="space-y-2">
        <p className="label-caps">Governança</p>
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">
          Central de entrevistas
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe, filtre e decida sobre todas as entrevistas em andamento.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        <MetricCard
          icon={<AlertCircle className="size-4" />}
          iconClassName={INTERVIEW_STATUS_STYLE.ENVIADA.className}
          label="Aguardando aprovação"
          value={metrics.aguardandoAprovacao}
        />
        <MetricCard
          icon={<MessageSquareWarning className="size-4" />}
          iconClassName={INTERVIEW_STATUS_STYLE.EM_REVISAO.className}
          label="Em revisão"
          value={metrics.emRevisao}
        />
        <MetricCard
          icon={<FileClock className="size-4" />}
          iconClassName={INTERVIEW_STATUS_STYLE.APROVADA.className}
          label="Aprovadas"
          value={metrics.aprovadas}
        />
        <MetricCard
          icon={<ClipboardList className="size-4" />}
          iconClassName="bg-muted text-muted-foreground"
          label="Total emitidas"
          value={metrics.totalEmitidas}
        />
      </section>

      <InterviewFilters areas={areas} respondents={respondents} />

      {interviews.length === 0 ? (
        <p className="surface-panel px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhuma entrevista encontrada com esses filtros.
        </p>
      ) : (
        <section className="surface-panel divide-y divide-border">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.6875rem] tracking-widest text-brand">
                    {interview.link.process.code}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {interview.link.process.area.name}
                  </span>
                  <Badge className={INTERVIEW_STATUS_STYLE[interview.status].className}>
                    {INTERVIEW_STATUS_STYLE[interview.status].label}
                  </Badge>
                </div>
                <p className="truncate font-medium">{interview.link.process.name}</p>
                <p className="text-xs text-muted-foreground">
                  {interview.link.respondent.name} · {interview.link.respondent.email}
                </p>
              </div>
              <Link
                href={`/entrevistas/${interview.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {interview.status === "ENVIADA" ? "Revisar / Decidir" : "Ver respostas"}
              </Link>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: ReactNode;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <div className="surface-panel flex items-center gap-3 p-4">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", iconClassName)}>
        {icon}
      </span>
      <div>
        <p className="text-2xl leading-7 font-semibold tracking-tight">{value}</p>
        <p className="label-caps">{label}</p>
      </div>
    </div>
  );
}
