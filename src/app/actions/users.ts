"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { findOrCreatePendingUser } from "@/lib/auth/pending-user";
import { db } from "@/lib/db";
import { listKnownUsers } from "@/lib/queries/users";

/** Colaboradores ja conhecidos, para os seletores de "Responsavel pela
 * Area"/"Responsavel pelo Processo" — so gestor pode montar esses cadastros. */
export async function listUserOptions() {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") return [];
  return listKnownUsers();
}

const pendingOwnerSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  email: z.email("E-mail inválido."),
});

export interface ResolvePendingOwnerResult {
  ok: boolean;
  error?: string;
  user?: { id: string; name: string; email: string };
}

/** Cria (ou reaproveita) um usuário "pendente" — alguém que ainda não logou
 * no Atlas — para poder ser escolhido como responsável de área/processo. O
 * mesmo mecanismo já usado para convite de entrevista por e-mail. */
export async function resolvePendingOwner(input: unknown): Promise<ResolvePendingOwnerResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") {
    return { ok: false, error: "Só um gestor pode cadastrar responsáveis." };
  }

  const parsed = pendingOwnerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await findOrCreatePendingUser(parsed.data.email, parsed.data.name);
  return { ok: true, user: { id: user.id, name: user.name, email: user.email } };
}

const schema = z.object({
  userId: z.string().min(1),
  role: z.enum(["GESTOR", "COLABORADOR"]),
});

export interface UpdateRoleResult {
  ok: boolean;
  error?: string;
}

export async function updateUserRole(input: unknown): Promise<UpdateRoleResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") {
    return { ok: false, error: "Só um gestor pode alterar papéis." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  if (parsed.data.userId === session.user.id && parsed.data.role === "COLABORADOR") {
    return { ok: false, error: "Você não pode rebaixar a própria conta." };
  }

  await db.user.update({ where: { id: parsed.data.userId }, data: { role: parsed.data.role } });
  revalidatePath("/administracao/usuarios");
  return { ok: true };
}
