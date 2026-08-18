import "server-only";
import { db } from "@/lib/db";

/**
 * Colaboradores ja conhecidos do Atlas — quem ja logou pelo menos uma vez, ou
 * foi convidado por e-mail antes disso (registro "pending"). E a base do
 * seletor de convite enquanto o diretorio completo do Entra (Fase B, Graph
 * `/users`) nao estiver ligado — ver src/lib/graph/directory.ts.
 */
/**
 * Perfil do próprio usuário logado — nome, e-mail e a função/departamento
 * vindos do Entra ID (`jobTitle`/`department`, preenchidos em
 * `provisionUser` no login). Usado no menu de perfil e na landing de
 * "Minhas entrevistas", nunca a role interna do Atlas (GESTOR/COLABORADOR).
 */
export async function getUserProfile(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    jobTitle: user.jobTitle,
    role: user.role,
  };
}

export async function listKnownUsers() {
  const users = await db.user.findMany({ orderBy: { name: "asc" } });
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    department: user.department,
    jobTitle: user.jobTitle,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isPending: user.entraOid.startsWith("pending:"),
  }));
}
