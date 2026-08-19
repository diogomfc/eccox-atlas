import "server-only";
import { db } from "@/lib/db";
import { type Answer, AnswerSchema, emptyAnswer } from "@/lib/interview/answers";
import type { InterviewAnswer } from "@/generated/prisma/client";
import {
  currentPrompt,
  type InterviewPrompt,
  type QuestionWithSection,
  sortQuestions,
} from "@/lib/interview/engine";

export interface InterviewState {
  token: string;
  status: "ok" | "expirado" | "concluido";
  /** null até a primeira resposta ser salva (Interview é criada sob demanda
   * em submitAnswer) — sem isso ainda não dá pra anexar evidência. */
  interviewId: string | null;
  process: {
    id: string;
    code: string;
    name: string;
    objective: string | null;
    areaName: string;
    areaSigla: string;
  };
  respondent: { id: string; name: string; email: string };
  interviewStatus: "RASCUNHO" | "ENVIADA" | "EM_REVISAO" | "APROVADA" | null;
  reviewComment: string | null;
  prompt: InterviewPrompt;
  /** Trilha completa, ordenada — usada tanto pelo assistente quanto pela revisão. */
  questions: QuestionWithSection[];
  answersByQuestionId: Record<string, Answer>;
  /** Perguntas com resposta de fato salva (linha em `InterviewAnswer`) — usado
   * pra distinguir "opcional em branco por nunca ter sido visitada" de
   * "opcional em branco porque o colaborador visitou e deixou assim". */
  visitedQuestionIds: string[];
  attachmentsByQuestionId: Record<
    string,
    Array<{ id: string; fileName: string; fileSize: number; mimeType: string }>
  >;
}

export async function getInterviewByToken(token: string): Promise<InterviewState | null> {
  const link = await db.interviewLink.findUnique({
    where: { token },
    include: {
      process: { include: { area: true, questions: { include: { section: true } } } },
      respondent: true,
      interview: {
        include: {
          answers: true,
          attachments: true,
          reviews: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!link) return null;

  const answers: InterviewAnswer[] = link.interview?.answers ?? [];
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  const completed = Boolean(
    link.interview && (link.interview.status === "ENVIADA" || link.interview.status === "APROVADA"),
  );
  const expired = link.expiresAt.getTime() < Date.now();
  const lastReview = link.interview?.reviews[0];

  const questions = sortQuestions(link.process.questions);
  const answersByQuestionId: Record<string, Answer> = {};
  for (const question of questions) {
    const stored = answers.find((answer) => answer.questionId === question.id);
    const parsed = stored ? AnswerSchema.safeParse(stored.valueJson) : null;
    answersByQuestionId[question.id] = parsed?.success
      ? parsed.data
      : emptyAnswer(question.inputKind);
  }

  const attachmentsByQuestionId: InterviewState["attachmentsByQuestionId"] = {};
  for (const attachment of link.interview?.attachments ?? []) {
    const list = attachmentsByQuestionId[attachment.questionId] ?? [];
    list.push({
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
    });
    attachmentsByQuestionId[attachment.questionId] = list;
  }

  return {
    token,
    status: completed ? "concluido" : expired ? "expirado" : "ok",
    interviewId: link.interview?.id ?? null,
    process: {
      id: link.process.id,
      code: link.process.code,
      name: link.process.name,
      objective: link.process.objective,
      areaName: link.process.area?.name ?? "",
      areaSigla: link.process.area?.sigla ?? "",
    },
    respondent: {
      id: link.respondent?.id ?? "",
      name: link.respondent?.name ?? "",
      email: link.respondent?.email ?? "",
    },
    interviewStatus: link.interview?.status ?? null,
    reviewComment:
      link.interview?.status === "EM_REVISAO" && lastReview?.decision === "SOLICITAR_REVISAO"
        ? (lastReview.comment ?? null)
        : null,
    prompt: currentPrompt(link.process.questions, answeredIds, completed),
    questions,
    answersByQuestionId,
    visitedQuestionIds: [...answeredIds],
    attachmentsByQuestionId,
  };
}
