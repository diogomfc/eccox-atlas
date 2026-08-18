import { CheckCircle2, ClipboardList, Clock, MessageSquareWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { UserAvatar } from "@/components/layout/user-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { INTERVIEW_STATUS_STYLE } from "@/lib/badges";
import { listMyInterviews } from "@/lib/queries/reviews";
import { getUserProfile } from "@/lib/queries/users";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Minhas entrevistas" };

type InterviewStatus = "RASCUNHO" | "ENVIADA" | "EM_REVISAO" | "APROVADA";

function actionLabel(status: InterviewStatus | null): string {
  switch (status) {
    case null:
      return "Responder";
    case "RASCUNHO":
    case "EM_REVISAO":
      return "Continuar";
    default:
      return "Ver respostas";
  }
}

export default async function MyInterviewsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [profile, links] = await Promise.all([
    getUserProfile(session.user.id),
    listMyInterviews(session.user.id),
  ]);

  const name = profile?.name ?? session.user.name ?? session.user.email ?? "?";

  const pendentes = links.filter((link) => !link.interview || link.interview.status === "RASCUNHO");
  const emAndamento = links.filter(
    (link) => link.interview?.status === "ENVIADA" || link.interview?.status === "EM_REVISAO",
  );
  const concluidas = links.filter((link) => link.interview?.status === "APROVADA");

  return (
    <div className="container-page space-y-8 pt-10">
      <header className="surface-panel flex flex-wrap items-center gap-5 p-6">
        <UserAvatar name={name} className="size-16 text-base" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="label-caps">Visão geral das suas entrevistas</p>
          <h1 className="text-[1.5rem] leading-8 font-semibold tracking-tight">{name}</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.jobTitle ? profile.jobTitle : "Colaborador"}
            {profile?.department ? ` · ${profile.department}` : ""}
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<ClipboardList className="size-4" />}
          label="Pendentes"
          value={pendentes.length}
        />
        <MetricCard
          icon={<Clock className="size-4" />}
          label="Em andamento"
          value={emAndamento.length}
        />
        <MetricCard
          icon={<CheckCircle2 className="size-4" />}
          label="Concluídas"
          value={concluidas.length}
        />
      </section>

      <section className="space-y-3">
        <h2 className="label-caps">Processos atribuídos a você</h2>
        {links.length === 0 ? (
          <p className="surface-panel px-6 py-10 text-center text-sm text-muted-foreground">
            Nenhuma entrevista atribuída a você ainda.
          </p>
        ) : (
          <ul className="surface-panel divide-y divide-border">
            {links.map((link) => {
              const status = link.interview?.status ?? null;
              const comment =
                status === "EM_REVISAO" ? link.interview?.reviews[0]?.comment : undefined;
              const style = status
                ? INTERVIEW_STATUS_STYLE[status]
                : INTERVIEW_STATUS_STYLE.RASCUNHO;

              return (
                <li key={link.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[0.6875rem] tracking-widest text-brand">
                        {link.process.code}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {link.process.area.name}
                      </span>
                      <Badge className={style.className}>
                        {status ? style.label : "Não iniciada"}
                      </Badge>
                    </div>
                    <p className="truncate font-medium">{link.process.name}</p>
                    {comment ? (
                      <p className="flex items-start gap-1.5 text-xs text-warning">
                        <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0" />
                        Revisão solicitada: {comment}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/entrevista/${link.token}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {actionLabel(status)}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="surface-panel flex items-center gap-3 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      <div>
        <p className="text-2xl leading-7 font-semibold tracking-tight">{value}</p>
        <p className="label-caps">{label}</p>
      </div>
    </div>
  );
}
