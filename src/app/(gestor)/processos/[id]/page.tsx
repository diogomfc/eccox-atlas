import { Download, FileDown, FileText, Inbox, Loader2, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { generateAiFirstFlow } from "@/app/actions/flow-suggestion";
import { InviteDialog } from "@/components/atlas/invite-dialog";
import { AiFirstAnalysisSection } from "@/components/documents/ai-first-analysis-section";
import { ConsolidatedAnswerItem } from "@/components/processes/consolidated-answer-item";
import { ConsolidationActions } from "@/components/processes/consolidation-actions";
import { ProcessLinksList } from "@/components/processes/process-links-list";
import { ProcessTabs } from "@/components/processes/process-tabs";
import { RoteiroAccordion } from "@/components/processes/roteiro-accordion";
import { RoteiroStatusCard } from "@/components/processes/roteiro-status-card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROCESS_PRIORITY_STYLE, PROCESS_STATUS_STYLE } from "@/lib/badges";
import type { AiFirstAnalysisData } from "@/lib/documents/ai-first-analysis";
import type { FlowEdgeData, FlowNodeData } from "@/lib/documents/flow";
import { CLASSIFICATION_LABEL, WAVE_LABEL } from "@/lib/domain";
import { AnswerSchema } from "@/lib/interview/answers";
import { getApprovedAnswerCounts, getProcessDetail } from "@/lib/queries/processes";
import { cn } from "@/lib/utils";

interface ProcessPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ areaFrom?: string }>;
}

export async function generateMetadata({ params }: ProcessPageProps): Promise<Metadata> {
  const { id } = await params;
  const process = await getProcessDetail(id);
  return { title: process?.name ?? "Processo" };
}

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat("pt-BR").format(date) : "—";
}

export default async function ProcessPage({ params, searchParams }: ProcessPageProps) {
  const { id } = await params;
  const { areaFrom } = await searchParams;
  const process = await getProcessDetail(id);
  if (!process) notFound();
  const approvedAnswerCounts = await getApprovedAnswerCounts(id);

  const latestDocument = process.documents[0];
  const asIsFlowRow = latestDocument?.flows.find((item) => item.kind === "AS_IS");
  const toBeFlowRow = latestDocument?.flows.find((item) => item.kind === "TO_BE");
  const flow = asIsFlowRow
    ? {
        nodes: asIsFlowRow.nodesJson as unknown as FlowNodeData[],
        edges: asIsFlowRow.edgesJson as unknown as FlowEdgeData[],
      }
    : null;
  const flowToBe =
    toBeFlowRow?.analysisJson != null
      ? {
          nodes: toBeFlowRow.nodesJson as unknown as FlowNodeData[],
          edges: toBeFlowRow.edgesJson as unknown as FlowEdgeData[],
          analysis: toBeFlowRow.analysisJson as unknown as AiFirstAnalysisData,
        }
      : null;

  const consolidatedByQuestionId = new Map(
    process.consolidatedAnswers.map((answer) => [answer.questionId, answer]),
  );
  const attachmentsByQuestionId = new Map<string, typeof process.attachments>();
  for (const attachment of process.attachments) {
    const list = attachmentsByQuestionId.get(attachment.questionId) ?? [];
    list.push(attachment);
    attachmentsByQuestionId.set(attachment.questionId, list);
  }

  const roteiroGroups = process.sections.map((section) => ({
    sectionId: section.id,
    label: section.label,
    items: section.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((question) => {
        const consolidated = consolidatedByQuestionId.get(question.id);
        const parsed = consolidated ? AnswerSchema.safeParse(consolidated.valueJson) : null;
        return {
          questionId: question.id,
          questionText: question.questionText,
          content: (
            <ConsolidatedAnswerItem
              processId={process.id}
              question={question}
              value={parsed?.success ? parsed.data : null}
              isAiGenerated={consolidated?.isAiGenerated ?? false}
              editedByName={consolidated?.editedBy?.name ?? null}
              rationale={consolidated?.rationale ?? null}
              attachments={attachmentsByQuestionId.get(question.id) ?? []}
              approvedAnswerCount={approvedAnswerCounts[question.id] ?? 0}
            />
          ),
        };
      }),
  }));

  const totalInvites = process.links.length;
  const approvedCount = process.links.filter(
    (link) => link.interview?.status === "APROVADA",
  ).length;
  const allApproved = totalInvites > 0 && approvedCount === totalInvites;
  const isMultiEligible = totalInvites > 1 && allApproved;

  const overview = (
    <>
      <div className="surface-panel grid grid-cols-2 gap-4 p-5 text-sm sm:grid-cols-4">
        <Info label="Responsável pela área">
          {process.area.owner?.name ?? process.area.ownerName ?? "—"}
        </Info>
        <Info label="Responsável pelo processo">{process.owner?.name ?? "—"}</Info>
        <Info label="Onda">{WAVE_LABEL[process.wave]}</Info>
        <Info label="Política relacionada">{process.relatedPolicyRef || "—"}</Info>
      </div>

      <div className="no-print surface-panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold tracking-tight">Documento</h2>
          <div className="flex flex-wrap gap-2">
            <ConsolidationActions
              processId={process.id}
              totalInvites={totalInvites}
              approvedCount={approvedCount}
              hasConsolidated={process.consolidatedAnswers.length > 0}
              hasDocument={Boolean(latestDocument)}
              isApproved={process.status === "APROVADO"}
            />
            <Link
              href={`/administracao/processos/${process.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Pencil data-icon="inline-start" />
              Editar estrutura e roteiro
            </Link>
            {latestDocument ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <Download data-icon="inline-start" />
                  Exportar
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem render={<a href={`/processos/${process.id}/documento/docx`} />}>
                    <FileDown className="size-3.5" />
                    DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<a href={`/processos/${process.id}/documento`} />}>
                    <FileText className="size-3.5" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {latestDocument ? (
          <>
            <Badge
              className={
                latestDocument.isDraft
                  ? PROCESS_STATUS_STYLE.EM_REVISAO.className
                  : PROCESS_STATUS_STYLE.APROVADO.className
              }
            >
              {latestDocument.isDraft ? "Rascunho — aguardando aprovação" : "Aprovado"}
            </Badge>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Código" value={process.code} mono />
              <Field label="Área" value={process.area.name} />
              <Field label="Versão" value={`v${latestDocument.version}`} mono />
              <Field
                label="Classificação"
                value={CLASSIFICATION_LABEL[latestDocument.classification]}
              />
              <Field label="Elaborado por" value={latestDocument.elaboradoPor} />
              <Field label="Data de elaboração" value={formatDate(latestDocument.dataElaboracao)} />
              <Field label="Aprovado por" value={latestDocument.aprovadoPor ?? "—"} />
              <Field label="Data de aprovação" value={formatDate(latestDocument.dataAprovacao)} />
              <Field label="Publicado em" value={latestDocument.publicadoEm} />
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum documento gerado ainda — ele é criado automaticamente quando a entrevista é
            enviada para aprovação.
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="label-caps">Roteiro definitivo</h2>
        {totalInvites === 0 ? (
          <RoteiroStatusCard
            icon={<Inbox className="size-5" />}
            title="Nenhum convite emitido ainda."
            description="Convide um colaborador na aba Convites & Entrevistas pra começar a coletar respostas."
          />
        ) : !allApproved ? (
          <RoteiroStatusCard
            icon={<Loader2 className="size-5 animate-spin" />}
            title={
              totalInvites === 1
                ? "Aguardando conclusão e aprovação da entrevista…"
                : "Aguardando respostas de todas as entrevistas para consolidação…"
            }
            progress={
              totalInvites > 1 ? { current: approvedCount, total: totalInvites } : undefined
            }
          />
        ) : (
          <>
            {isMultiEligible ? (
              <p className="text-xs text-muted-foreground">
                {process.consolidatedAnswers.length === 0
                  ? 'Todas as entrevistas foram aprovadas — clique em "Consolidar com IA" acima pra gerar o roteiro definitivo.'
                  : 'Todas as entrevistas foram aprovadas. Se o roteiro abaixo ainda não reflete todas as respostas, clique em "Reconsolidar" acima.'}
              </p>
            ) : null}
            <RoteiroAccordion groups={roteiroGroups} />
          </>
        )}
      </section>
    </>
  );

  const aiFirst = flow ? (
    <AiFirstAnalysisSection
      processName={process.name}
      asIs={flow}
      toBe={flowToBe}
      canGenerate={process.status === "APROVADO"}
      onGenerate={
        process.status === "APROVADO" ? generateAiFirstFlow.bind(null, process.id) : undefined
      }
    />
  ) : (
    <p className="surface-panel px-6 py-10 text-center text-sm text-muted-foreground">
      Sem Passos suficientes ainda para desenhar o fluxo — o desenho aparece assim que a entrevista
      for enviada para aprovação.
    </p>
  );

  const invites = (
    <section className="surface-panel space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold tracking-tight">Convites emitidos</h2>
        <InviteDialog processes={[{ id: process.id, code: process.code, name: process.name }]} />
      </div>
      <ProcessLinksList
        processId={process.id}
        links={process.links.map((link) => ({
          id: link.id,
          token: link.token,
          respondentName: link.respondent.name,
          respondentEmail: link.respondent.email,
          interviewId: link.interview?.id ?? null,
          interviewStatus: link.interview?.status ?? null,
        }))}
      />
    </section>
  );

  return (
    <div className="container-page space-y-6 pt-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/atlas" />}>Atlas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              render={
                <Link
                  href={
                    areaFrom
                      ? `/atlas/${areaFrom}`
                      : { pathname: "/processos", query: { areaId: process.areaId } }
                  }
                />
              }
            >
              {process.area.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{process.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[0.625rem] tracking-widest text-brand">
            {process.code}
          </span>
          <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">{process.name}</h1>
          <p className="text-sm text-muted-foreground">{process.area.name}</p>
        </div>
        <div className="flex gap-2">
          <Badge className={PROCESS_PRIORITY_STYLE[process.priority].className}>
            {PROCESS_PRIORITY_STYLE[process.priority].label}
          </Badge>
          <Badge className={PROCESS_STATUS_STYLE[process.status].className}>
            {PROCESS_STATUS_STYLE[process.status].label}
          </Badge>
        </div>
      </header>

      <ProcessTabs overview={overview} aiFirst={aiFirst} invites={invites} />
    </div>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className="font-medium">{children}</p>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className={mono ? "font-mono text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}
