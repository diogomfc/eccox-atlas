import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { InterviewShell } from "@/components/interview/interview-shell";
import { UserAvatar } from "@/components/layout/user-avatar";
import { buttonVariants } from "@/components/ui/button";
import { getInterviewByToken } from "@/lib/queries/interview";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrevista" };

interface InterviewPageProps {
  params: Promise<{ token: string }>;
}

/**
 * O convite exige login: o respondente é um colaborador com conta no Entra
 * ID (ou mock, em dev), e precisa ser exatamente o usuário convidado — não
 * basta estar logado como qualquer colaborador. src/proxy.ts faz a checagem
 * otimista de cookie; aqui confere a identidade de verdade.
 */
export default async function InterviewPage({ params }: InterviewPageProps) {
  const { token } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/login?redirectTo=/entrevista/${token}`);

  const state = await getInterviewByToken(token);
  if (!state) notFound();

  const isRightPerson = session.user.id === state.respondent.id;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="container-page flex h-14 items-center gap-3">
          <Link
            href="/minhas-entrevistas"
            aria-label="Voltar para Minhas entrevistas"
            className="flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <Logo shape="icon" className="h-6" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{state.process.name}</p>
            <p className="font-mono text-[0.625rem] tracking-widest text-brand">
              {state.process.code} · {state.process.areaName}
            </p>
          </div>
          {isRightPerson ? (
            <div className="flex items-center gap-2">
              <UserAvatar name={session.user.name ?? state.respondent.name} />
              <span className="text-xs text-muted-foreground">{state.respondent.name}</span>
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex-1 pb-24">
        {!isRightPerson ? (
          <WrongPerson token={token} respondentEmail={state.respondent.email} />
        ) : state.status === "expirado" ? (
          <Expired />
        ) : (
          <InterviewShell state={state} />
        )}
      </main>
    </div>
  );
}

function Expired() {
  return (
    <div className="container-read space-y-3 pt-24">
      <p className="label-caps">Link expirado</p>
      <h1 className="text-[1.5rem] leading-8 font-semibold tracking-tight">
        Este convite não vale mais
      </h1>
      <p className="text-muted-foreground">
        Peça um novo link a quem enviou o convite. As respostas já registradas foram preservadas.
      </p>
    </div>
  );
}

function WrongPerson({ token, respondentEmail }: { token: string; respondentEmail: string }) {
  return (
    <div className="container-read space-y-4 pt-24">
      <p className="label-caps">Convite não é seu</p>
      <h1 className="text-[1.5rem] leading-8 font-semibold tracking-tight">
        Este convite foi enviado para outra conta
      </h1>
      <p className="text-muted-foreground">
        Esta entrevista pertence a <strong>{respondentEmail}</strong>. Entre com essa conta para
        respondê-la.
      </p>
      <a
        href={`/api/session/clear?redirectTo=${encodeURIComponent(`/entrevista/${token}`)}`}
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Trocar de conta
      </a>
    </div>
  );
}
