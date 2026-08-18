"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { isEntraDirectoryEnabled } from "@/lib/auth/entra-enabled";
import { findOrCreatePendingUser } from "@/lib/auth/pending-user";
import { db } from "@/lib/db";
import { searchDirectory } from "@/lib/graph/directory";
import { listKnownUsers } from "@/lib/queries/users";

const createSchema = z.object({
  processId: z.string().min(1),
  /** Um dos dois: escolhido da lista de conhecidos, ou convite por e-mail. */
  respondentUserId: z.string().min(1).optional(),
  respondentEmail: z.email().optional(),
  respondentName: z.string().trim().max(120).optional(),
  expiresInDays: z.number().int().min(1).max(90).default(30),
});

export interface CreateLinkResult {
  ok: boolean;
  error?: string;
  link?: { token: string; url: string; expiresAt: string };
}

async function requireGestor() {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") return null;
  return session;
}

export async function createInterviewLink(input: unknown): Promise<CreateLinkResult> {
  const session = await requireGestor();
  if (!session) return { ok: false, error: "Só um gestor pode emitir convites." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { processId, respondentUserId, respondentEmail, respondentName, expiresInDays } =
    parsed.data;
  if (!respondentUserId && !respondentEmail) {
    return { ok: false, error: "Escolha um colaborador ou informe um e-mail." };
  }

  const processRecord = await db.process.findUnique({ where: { id: processId } });
  if (!processRecord) return { ok: false, error: "Processo não encontrado." };

  const respondent = respondentUserId
    ? await db.user.findUnique({ where: { id: respondentUserId } })
    : await findOrCreatePendingUser(respondentEmail as string, respondentName ?? "");
  if (!respondent) return { ok: false, error: "Colaborador não encontrado." };

  const isSelfInvite =
    respondent.id === session.user.id ||
    respondent.email.toLowerCase() === (session.user.email ?? "").toLowerCase();
  if (isSelfInvite) {
    return {
      ok: false,
      error:
        "Você não pode se convidar para a própria entrevista. Peça a outro gestor para enviar este convite.",
    };
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const token = nanoid(32);

  await db.interviewLink.create({
    data: {
      processId,
      token,
      expiresAt,
      invitedById: session.user.id,
      respondentUserId: respondent.id,
    },
  });

  await db.process.update({
    where: { id: processId },
    data: { status: "EM_ENTREVISTA" },
  });

  revalidatePath(`/processos/${processId}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    ok: true,
    link: { token, url: `${appUrl}/entrevista/${token}`, expiresAt: expiresAt.toISOString() },
  };
}

/** Colaboradores ja conhecidos do Atlas — base do seletor de convite. O
 * proprio gestor logado nao aparece: nao pode se auto-convidar. */
export async function listInviteCandidates() {
  const session = await requireGestor();
  if (!session) return [];
  const users = await listKnownUsers();
  return users.filter((user) => user.id !== session.user.id);
}

/**
 * Busca no diretorio completo do Entra ID via Graph, usando o token do
 * proprio gestor. So funciona com NEXT_PUBLIC_ENTRA_DIRECTORY_ENABLED=true e
 * consentimento do admin do tenant — qualquer falha devolve `null` e a UI
 * cai para a lista de colaboradores ja conhecidos.
 */
export async function searchCompanyDirectory(
  query: string,
): Promise<Array<{ name: string; email: string; department: string | null }> | null> {
  if (!isEntraDirectoryEnabled()) return null;

  const session = await auth();
  if (!session?.accessToken || session.user.role !== "GESTOR") return null;

  try {
    const results = await searchDirectory(session.accessToken, query);
    return results.map((user) => ({
      name: user.name,
      email: user.email,
      department: user.department,
    }));
  } catch (error) {
    console.warn("[entrevistas] diretorio do Entra indisponivel:", error);
    return null;
  }
}
