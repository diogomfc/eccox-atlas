"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateDocumentFromConsolidatedAnswers } from "@/lib/documents/build";
import {
  consolidateProcessInterviews,
  consolidateSingleQuestion,
} from "@/lib/documents/consolidation";
import { AnswerSchema } from "@/lib/interview/answers";
import { toJson } from "@/lib/json";

export interface ConsolidationActionResult {
  ok: boolean;
  error?: string;
}

async function requireGestor() {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") return null;
  return session;
}

/**
 * Roda a consolidação: agrupa as respostas de todas as entrevistas
 * APROVADA do processo, uma resposta definitiva por pergunta, e regenera o
 * Document oficial a partir daí. Pode ser chamado de novo a qualquer momento
 * ("Reconsolidar") — reescreve a resposta definitiva de cada pergunta do
 * zero, perdendo edições manuais anteriores nela.
 */
export async function consolidateInterviewsAction(
  processId: string,
): Promise<ConsolidationActionResult> {
  const session = await requireGestor();
  if (!session) return { ok: false, error: "Só um gestor pode consolidar entrevistas." };

  const eligible = await db.interview.count({
    where: { link: { processId }, status: "APROVADA" },
  });
  if (eligible === 0) {
    return { ok: false, error: "Nenhuma entrevista aprovada ainda pra consolidar." };
  }

  await consolidateProcessInterviews(processId);

  revalidatePath(`/processos/${processId}`);
  revalidatePath(`/administracao/processos/${processId}`);
  return { ok: true };
}

const updateSchema = z.object({
  processId: z.string().min(1),
  questionId: z.string().min(1),
  answer: AnswerSchema,
});

/** Gestor sobrescreve manualmente a resposta definitiva de uma pergunta. */
export async function updateConsolidatedAnswerAction(
  input: unknown,
): Promise<ConsolidationActionResult> {
  const session = await requireGestor();
  if (!session) return { ok: false, error: "Só um gestor pode editar a resposta definitiva." };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { processId, questionId, answer } = parsed.data;

  await db.consolidatedAnswer.upsert({
    where: { processId_questionId: { processId, questionId } },
    update: {
      valueJson: toJson(answer),
      isAiGenerated: false,
      editedByUserId: session.user.id,
      rationale: null,
    },
    create: {
      processId,
      questionId,
      valueJson: toJson(answer),
      isAiGenerated: false,
      editedByUserId: session.user.id,
    },
  });

  await generateDocumentFromConsolidatedAnswers(processId);

  revalidatePath(`/processos/${processId}`);
  return { ok: true };
}

/**
 * Aprovação final do processo — novo gate único, na visão consolidada.
 * Substitui o que `approveInterview` fazia com `process.status`/`Document`:
 * aprovação por entrevista individual não aprova mais o processo inteiro
 * (ver src/app/actions/review.ts).
 */
export async function approveProcessAction(processId: string): Promise<ConsolidationActionResult> {
  const session = await requireGestor();
  if (!session) return { ok: false, error: "Só um gestor pode aprovar o processo." };

  const document = await db.document.findFirst({
    where: { processId },
    orderBy: { version: "desc" },
  });
  if (!document) {
    return { ok: false, error: "Consolide as entrevistas antes de aprovar o processo." };
  }

  await db.$transaction([
    db.process.update({ where: { id: processId }, data: { status: "APROVADO" } }),
    db.document.update({
      where: { id: document.id },
      data: { isDraft: false, aprovadoPor: session.user.name, dataAprovacao: new Date() },
    }),
  ]);

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
  revalidatePath("/atlas");
  return { ok: true };
}

/** Consolida só uma pergunta — botão individual no roteiro definitivo,
 * mesma fonte (entrevistas APROVADA) e critério do botão global. */
export async function consolidateSingleQuestionAction(
  processId: string,
  questionId: string,
): Promise<ConsolidationActionResult> {
  const session = await requireGestor();
  if (!session) return { ok: false, error: "Só um gestor pode consolidar entrevistas." };

  const result = await consolidateSingleQuestion(processId, questionId);
  revalidatePath(`/processos/${processId}`);
  return result;
}
