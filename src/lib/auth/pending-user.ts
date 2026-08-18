import "server-only";
import { db } from "@/lib/db";

/**
 * O gestor pode convidar alguem que ainda nunca logou no Atlas. Cria um `User`
 * com um oid sintetico e reconciliavel — no primeiro login real dessa pessoa,
 * `provisionUser` (src/lib/auth/provision.ts) encontra o registro pelo e-mail
 * e assume o oid verdadeiro do Entra, sem duplicar.
 */
export async function findOrCreatePendingUser(email: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return existing;

  return db.user.create({
    data: {
      entraOid: `pending:${normalizedEmail}`,
      email: normalizedEmail,
      name: name.trim() || normalizedEmail,
      role: "COLABORADOR",
    },
  });
}
