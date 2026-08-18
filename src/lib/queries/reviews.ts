import "server-only";
import type { InterviewStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export interface InterviewDashboardMetrics {
  aguardandoAprovacao: number;
  emRevisao: number;
  aprovadas: number;
  totalEmitidas: number;
}

/** Contadores do topo da Central de Entrevistas — independentes dos filtros
 * da lista, sempre o panorama geral. */
export async function getInterviewDashboardMetrics(): Promise<InterviewDashboardMetrics> {
  const [aguardandoAprovacao, emRevisao, aprovadas, totalEmitidas] = await Promise.all([
    db.interview.count({ where: { status: "ENVIADA" } }),
    db.interview.count({ where: { status: "EM_REVISAO" } }),
    db.interview.count({ where: { status: "APROVADA" } }),
    db.interviewLink.count(),
  ]);
  return { aguardandoAprovacao, emRevisao, aprovadas, totalEmitidas };
}

/** Só respondentes que já têm pelo menos um convite — base do filtro "por
 * colaborador", em vez de listar todo mundo cadastrado no Atlas. */
export async function listInterviewRespondents() {
  const users = await db.user.findMany({
    where: { interviewLinks: { some: {} } },
    orderBy: { name: "asc" },
  });
  return users.map((user) => ({ id: user.id, name: user.name }));
}

export interface InterviewFilters {
  status?: InterviewStatus;
  areaId?: string;
  respondentUserId?: string;
  q?: string;
}

/** Lista completa de entrevistas iniciadas (com pelo menos uma resposta ou
 * envio), pra Central de Gestão de Entrevistas — ao contrário de
 * `listPendingReviews`, cobre qualquer status, filtrável. */
export async function listAllInterviews(filters: InterviewFilters = {}) {
  const { status, areaId, respondentUserId, q } = filters;

  const where: Prisma.InterviewWhereInput = {
    ...(status ? { status } : {}),
    link: {
      ...(areaId ? { process: { areaId } } : {}),
      ...(respondentUserId ? { respondentUserId } : {}),
      ...(q
        ? {
            OR: [
              { process: { name: { contains: q, mode: "insensitive" } } },
              { process: { code: { contains: q, mode: "insensitive" } } },
              { respondent: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
  };

  return db.interview.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    include: {
      link: { include: { process: { include: { area: true } }, respondent: true } },
      reviews: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

/**
 * Respostas + anexos de UM respondente específico — montada ao vivo a partir
 * de `interview.answers` via `buildSections` (mesma função pura da
 * montagem do Document), não do `Document` do processo. Com múltiplos
 * respondentes por processo, o Document mais recente é o CONSOLIDADO (ou
 * nem existe ainda) — nunca é "o documento desta entrevista".
 */
export async function getInterviewForReview(interviewId: string) {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: {
      link: {
        include: {
          process: {
            include: {
              area: true,
              sections: {
                orderBy: { order: "asc" },
                include: { questions: { orderBy: { order: "asc" } } },
              },
            },
          },
          respondent: true,
        },
      },
      answers: { include: { question: { include: { section: true } } } },
      attachments: true,
      reviews: { orderBy: { createdAt: "desc" }, include: { reviewer: true } },
    },
  });
  if (!interview) return null;

  return { interview };
}

export async function listMyInterviews(userId: string) {
  return db.interviewLink.findMany({
    where: { respondentUserId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      process: { include: { area: true } },
      interview: { include: { reviews: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });
}
