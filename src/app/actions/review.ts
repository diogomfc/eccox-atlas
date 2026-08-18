"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { consolidateProcessInterviews } from "@/lib/documents/consolidation";

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

async function requireGestor() {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") return null;
  return session;
}

/**
 * Aprovação de UMA entrevista — controle de qualidade por respondente ("a
 * resposta desta pessoa está boa"). Com múltiplos respondentes por
 * processo, isso NÃO aprova mais o processo inteiro nem mexe no Document:
 * essa aprovação acontece na visão consolidada (`approveProcessAction`,
 * src/app/actions/consolidation.ts), via "Consolidar com IA".
 *
 * Exceção: se este for o ÚNICO convite do processo, a resposta desta pessoa
 * já É o roteiro definitivo — nada pra IA decidir entre respostas
 * concorrentes. Aplica direto (mesmo caminho de "1 resposta = cópia direta"
 * que `consolidateProcessInterviews` já usa por pergunta), sem exigir um
 * clique a mais do gestor.
 */
export async function approveInterview(interviewId: string): Promise<ReviewResult> {
  const session = await requireGestor();
  if (!session) return { ok: false, error: "Só um gestor pode aprovar." };

  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: { link: true },
  });
  if (!interview) return { ok: false, error: "Entrevista não encontrada." };
  if (interview.status !== "ENVIADA")
    return { ok: false, error: "Esta entrevista não está aguardando aprovação." };

  await db.$transaction([
    db.review.create({
      data: { interviewId, reviewerId: session.user.id, decision: "APROVADO" },
    }),
    db.interview.update({ where: { id: interviewId }, data: { status: "APROVADA" } }),
  ]);

  const totalInvites = await db.interviewLink.count({
    where: { processId: interview.link.processId },
  });
  if (totalInvites === 1) {
    await consolidateProcessInterviews(interview.link.processId);
  }

  revalidatePath("/entrevistas");
  revalidatePath(`/entrevistas/${interviewId}`);
  revalidatePath("/minhas-entrevistas");
  revalidatePath(`/processos/${interview.link.processId}`);
  return { ok: true };
}

const requestRevisionSchema = z.object({
  interviewId: z.string().min(1),
  comment: z.string().trim().min(1, "Descreva o que precisa ser ajustado."),
});

export async function requestRevision(input: unknown): Promise<ReviewResult> {
  const session = await requireGestor();
  if (!session) return { ok: false, error: "Só um gestor pode solicitar revisão." };

  const parsed = requestRevisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { interviewId, comment } = parsed.data;

  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: { link: true },
  });
  if (!interview) return { ok: false, error: "Entrevista não encontrada." };
  if (interview.status !== "ENVIADA")
    return { ok: false, error: "Esta entrevista não está aguardando aprovação." };

  await db.$transaction([
    db.review.create({
      data: { interviewId, reviewerId: session.user.id, decision: "SOLICITAR_REVISAO", comment },
    }),
    db.interview.update({ where: { id: interviewId }, data: { status: "EM_REVISAO" } }),
    db.process.update({
      where: { id: interview.link.processId },
      data: { status: "EM_ENTREVISTA" },
    }),
  ]);

  revalidatePath("/entrevistas");
  revalidatePath(`/entrevistas/${interviewId}`);
  revalidatePath("/minhas-entrevistas");
  return { ok: true };
}
