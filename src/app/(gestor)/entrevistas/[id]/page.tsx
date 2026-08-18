import { ArrowLeft, CheckCircle2, MessageSquareWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionAttachmentDropzone } from "@/components/interview/question-attachment-dropzone";
import { RoteiroAccordion } from "@/components/processes/roteiro-accordion";
import { ReviewActions } from "@/components/reviews/review-actions";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { safeRedirectTo } from "@/lib/auth/safe-redirect";
import { AnswerSchema, answerToText, isAnswerEmpty } from "@/lib/interview/answers";
import { getInterviewForReview } from "@/lib/queries/reviews";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getInterviewForReview(id);
  return { title: data?.interview.link.process.name ?? "Entrevista" };
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { id } = await params;
  const { from: rawFrom } = await searchParams;
  const data = await getInterviewForReview(id);
  if (!data) notFound();

  const { interview } = data;
  const { process } = interview.link;
  const from = rawFrom ? safeRedirectTo(decodeURIComponent(rawFrom), "") : "";

  const answerByQuestionId = new Map(
    interview.answers.map((answer) => [answer.questionId, answer]),
  );
  const attachmentsByQuestionId = new Map<string, typeof interview.attachments>();
  for (const attachment of interview.attachments) {
    const list = attachmentsByQuestionId.get(attachment.questionId) ?? [];
    list.push(attachment);
    attachmentsByQuestionId.set(attachment.questionId, list);
  }

  const groups = process.sections.map((section) => ({
    sectionId: section.id,
    label: section.label,
    items: section.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((question) => {
        const stored = answerByQuestionId.get(question.id);
        const parsed = stored ? AnswerSchema.safeParse(stored.valueJson) : null;
        const text = parsed?.success ? answerToText(parsed.data) : "";
        const filled = parsed?.success && !isAnswerEmpty(parsed.data);
        const attachments = attachmentsByQuestionId.get(question.id) ?? [];

        return {
          questionId: question.id,
          questionText: question.questionText,
          content: (
            <>
              <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                {filled ? text : "Não respondido."}
              </p>
              {question.allowEvidence ? (
                <QuestionAttachmentDropzone
                  processId={process.id}
                  questionId={question.id}
                  attachments={attachments}
                  readOnly
                />
              ) : null}
            </>
          ),
        };
      }),
  }));

  return (
    <div className="container-page space-y-6 pt-10">
      {from ? (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/atlas" />}>Atlas</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/atlas/${process.area.code}`} />}>
                {process.area.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={from as Parameters<typeof Link>[0]["href"]} />}>
                {process.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Respostas de {interview.link.respondent.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ) : (
        <Link
          href="/entrevistas"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Entrevistas
        </Link>
      )}

      <header className="space-y-1">
        <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[0.625rem] tracking-widest text-brand">
          {process.code}
        </span>
        <h1 className="text-[1.5rem] leading-8 font-semibold tracking-tight">{process.name}</h1>
        <p className="text-sm text-muted-foreground">
          Respondido por {interview.link.respondent.name} ({interview.link.respondent.email})
        </p>
      </header>

      {interview.status === "ENVIADA" ? <ReviewActions interviewId={interview.id} /> : null}

      {interview.reviews.length > 0 ? (
        <section className="surface-panel space-y-3 p-5">
          <h2 className="label-caps">Histórico de aprovação</h2>
          <ol className="space-y-3">
            {interview.reviews.map((review) => (
              <li key={review.id} className="flex items-start gap-3">
                {review.decision === "APROVADO" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{review.reviewer.name}</span>{" "}
                    {review.decision === "APROVADO" ? "aprovou" : "solicitou revisão"} em{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(review.createdAt)}
                  </p>
                  {review.comment ? (
                    <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="label-caps">Respostas de {interview.link.respondent.name}</h2>
        <RoteiroAccordion groups={groups} />
      </section>
    </div>
  );
}
