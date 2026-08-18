import "server-only";
import type { Prisma, ProcessPriority, ProcessStatus, Wave } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { sortQuestions } from "@/lib/interview/engine";

export interface ListProcessesFilters {
  q?: string;
  areaId?: string;
  status?: ProcessStatus;
  priority?: ProcessPriority;
  wave?: Wave;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export async function listProcesses(filters: ListProcessesFilters = {}) {
  const { q, areaId, status, priority, wave, page = 1, pageSize = DEFAULT_PAGE_SIZE } = filters;

  const where: Prisma.ProcessWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(areaId ? { areaId } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(wave ? { wave } : {}),
  };

  const [items, total] = await Promise.all([
    db.process.findMany({
      where,
      orderBy: [{ area: { name: "asc" } }, { code: "asc" }],
      include: { area: true, _count: { select: { questions: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.process.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getProcessDetail(id: string) {
  const process = await db.process.findUnique({
    where: { id },
    include: {
      area: { include: { owner: true } },
      owner: true,
      // Trilha plana, já com a seção de cada pergunta — usada pelo motor de
      // entrevista/documento (ver src/lib/interview/engine.ts).
      questions: {
        include: { section: true },
        orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
      },
      // Mesmos dados agrupados por seção, incluindo seções vazias — usado
      // pela tela de administração (criar pergunta num grupo sem nenhuma
      // ainda) e pelo resumo somente-leitura do roteiro.
      sections: {
        orderBy: { order: "asc" },
        include: { questions: { orderBy: { order: "asc" } } },
      },
      links: {
        orderBy: { createdAt: "desc" },
        include: {
          respondent: true,
          interview: { include: { reviews: { orderBy: { createdAt: "desc" }, take: 1 } } },
        },
      },
      documents: {
        orderBy: { version: "desc" },
        take: 1,
        include: { flows: true },
      },
      consolidatedAnswers: { include: { editedBy: true } },
      // Toda evidência do processo, de qualquer respondente ou anexada
      // direto na visão consolidada — a tela agrupa por questionId.
      attachments: true,
    },
  });
  if (!process) return null;

  return { ...process, questions: sortQuestions(process.questions) };
}

/**
 * Quantas entrevistas APROVADA responderam cada pergunta — usado pra decidir
 * quando o botão de consolidar uma pergunta individual aparece (só faz
 * sentido chamar IA com 2+ respostas pra unificar).
 */
export async function getApprovedAnswerCounts(processId: string): Promise<Record<string, number>> {
  const answers = await db.interviewAnswer.findMany({
    where: { interview: { status: "APROVADA", link: { processId } } },
    select: { questionId: true },
  });
  const counts: Record<string, number> = {};
  for (const answer of answers) {
    counts[answer.questionId] = (counts[answer.questionId] ?? 0) + 1;
  }
  return counts;
}
