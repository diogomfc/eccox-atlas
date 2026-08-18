import "server-only";
import type { UserRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const MAX_ITEMS = 6;

export interface NotificationItem {
  id: string;
  href: string;
  processCode: string;
  processName: string;
  detail: string;
}

export interface NotificationSummary {
  myPending: NotificationItem[];
  awaitingApproval: NotificationItem[];
  totalCount: number;
}

/**
 * Pendências do usuário logado, pro sino no header: sempre as próprias
 * entrevistas por responder/ajustar; gestor ganha também a fila de
 * aprovação (ENVIADA) de todo mundo — mesma fonte da Central de Entrevistas.
 */
export async function getNotificationSummary(
  userId: string,
  role: UserRole,
): Promise<NotificationSummary> {
  const myLinks = await db.interviewLink.findMany({
    where: {
      respondentUserId: userId,
      OR: [{ interview: null }, { interview: { status: { in: ["RASCUNHO", "EM_REVISAO"] } } }],
    },
    orderBy: { createdAt: "desc" },
    include: { process: true, interview: true },
  });

  const myPending: NotificationItem[] = myLinks.map((link) => ({
    id: link.id,
    href: `/entrevista/${link.token}`,
    processCode: link.process.code,
    processName: link.process.name,
    detail: link.interview?.status === "EM_REVISAO" ? "Ajuste solicitado" : "Não iniciada",
  }));

  let awaitingApproval: NotificationItem[] = [];
  if (role === "GESTOR") {
    const pending = await db.interview.findMany({
      where: { status: "ENVIADA" },
      orderBy: { submittedAt: "asc" },
      include: { link: { include: { process: true, respondent: true } } },
    });
    awaitingApproval = pending.map((interview) => ({
      id: interview.id,
      href: `/entrevistas/${interview.id}`,
      processCode: interview.link.process.code,
      processName: interview.link.process.name,
      detail: `Enviado por ${interview.link.respondent.name}`,
    }));
  }

  return {
    myPending: myPending.slice(0, MAX_ITEMS),
    awaitingApproval: awaitingApproval.slice(0, MAX_ITEMS),
    totalCount: myPending.length + awaitingApproval.length,
  };
}
