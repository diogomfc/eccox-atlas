"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AnswerSchema, isAnswerEmpty } from "@/lib/interview/answers";
import { currentPrompt } from "@/lib/interview/engine";

const submitSchema = z.object({
  token: z.string().min(1),
  questionId: z.string().min(1),
  answer: AnswerSchema,
});

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

/**
 * Grava a resposta de UM campo e retorna. A trilha inteira e determinada por
 * ProcessQuestion — sem IA decidindo o proximo passo. Cada resposta grava na
 * hora: fechar o browser no meio nao perde nada.
 */
export async function submitAnswer(input: unknown): Promise<SubmitResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Resposta em formato inválido." };
  const { token, questionId, answer } = parsed.data;

  const link = await db.interviewLink.findUnique({
    where: { token },
    include: {
      process: { include: { questions: true } },
      interview: true,
    },
  });

  if (!link) return { ok: false, error: "Link de entrevista não encontrado." };
  if (link.expiresAt.getTime() < Date.now()) return { ok: false, error: "Este link expirou." };
  if (
    link.interview &&
    (link.interview.status === "ENVIADA" || link.interview.status === "APROVADA")
  ) {
    return { ok: false, error: "Esta entrevista já foi enviada." };
  }

  const question = link.process.questions.find((item) => item.id === questionId);
  if (!question) return { ok: false, error: "Pergunta não encontrada neste processo." };

  if (question.required && isAnswerEmpty(answer)) {
    return { ok: false, error: "Esta pergunta precisa de uma resposta." };
  }

  const interview =
    link.interview ??
    (await db.interview.create({ data: { linkId: link.id, status: "RASCUNHO" } }));

  await db.interviewAnswer.upsert({
    where: { interviewId_questionId: { interviewId: interview.id, questionId } },
    update: { valueJson: answer },
    create: { interviewId: interview.id, questionId, valueJson: answer },
  });

  if (interview.status === "EM_REVISAO") {
    // Colaborador ja comecou a corrigir — volta pro estado de rascunho ate reenviar.
    await db.interview.update({ where: { id: interview.id }, data: { status: "RASCUNHO" } });
  }

  revalidatePath(`/entrevista/${token}`);
  return { ok: true };
}

/**
 * Envia a entrevista para aprovação: só pode ser chamado quando todas as
 * perguntas obrigatórias já têm resposta. NÃO gera mais Document sozinho —
 * com múltiplos respondentes por processo, o documento oficial só nasce da
 * consolidação (`src/lib/documents/consolidation.ts`, disparada pelo gestor
 * em `/processos/[id]`), não do envio de uma entrevista individual.
 */
export async function submitInterviewForReview(token: string): Promise<SubmitResult> {
  const link = await db.interviewLink.findUnique({
    where: { token },
    include: {
      process: { include: { questions: { include: { section: true } } } },
      interview: { include: { answers: true } },
    },
  });

  if (!link) return { ok: false, error: "Link de entrevista não encontrado." };
  if (link.expiresAt.getTime() < Date.now()) return { ok: false, error: "Este link expirou." };
  if (!link.interview) return { ok: false, error: "Nenhuma resposta registrada ainda." };

  const answeredIds = new Set(link.interview.answers.map((answer) => answer.questionId));
  const prompt = currentPrompt(link.process.questions, answeredIds, false);
  if (prompt.kind === "question") {
    return { ok: false, error: "Ainda há perguntas obrigatórias sem resposta." };
  }

  await db.interview.update({
    where: { id: link.interview.id },
    data: { status: "ENVIADA", submittedAt: new Date() },
  });

  // Não rebaixa um processo já aprovado só porque um respondente atrasado
  // enviou depois — só sinaliza "tem entrevista aguardando" se ainda não
  // tiver sido aprovado na visão consolidada.
  if (link.process.status !== "APROVADO") {
    await db.process.update({ where: { id: link.processId }, data: { status: "EM_REVISAO" } });
  }

  revalidatePath(`/entrevista/${token}`);
  revalidatePath("/entrevistas");
  revalidatePath("/minhas-entrevistas");
  return { ok: true };
}
