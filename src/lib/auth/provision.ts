import "server-only";
import { fetchOwnProfile } from "@/lib/auth/entra-graph";
import { db } from "@/lib/db";

/**
 * Lista de e-mails que sempre entram como GESTOR, em todo login — o mecanismo
 * de bootstrap que evita qualquer um ficar trancado fora da administração.
 * Formato: e-mails separados por virgula, comparados sem diferenciar maiusculas.
 */
function rootEmails(): Set<string> {
  const raw = process.env.ATLAS_ROOT_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

interface EntraIdentity {
  oid: string;
  email: string;
  name: string;
  accessToken?: string;
}

/**
 * Upsert do usuario a partir do login Entra ID. So roda no momento do login
 * (quando ha `account`/tokens novos) — trocas de papel feitas por um gestor
 * so aparecem no proximo login, nao a cada requisicao.
 */
export async function provisionUser(identity: EntraIdentity) {
  const email = identity.email.toLowerCase();
  const isRoot = rootEmails().has(email);

  const profile = identity.accessToken
    ? await fetchOwnProfile(identity.accessToken)
    : { department: null, jobTitle: null };

  const existing = await db.user.findUnique({ where: { entraOid: identity.oid } });

  // Reconciliacao: alguem pode ja existir com um oid "pending:<email>" — foi
  // convidado por e-mail antes de nunca ter logado (ver src/lib/auth/pending-user.ts).
  // O primeiro login real assume esse registro em vez de duplicar.
  const pending = existing ? null : await db.user.findUnique({ where: { email } });

  // Bootstrap: sem ninguem ainda cadastrado, o primeiro login vira GESTOR —
  // evita depender de saber o e-mail certo de antemao em ATLAS_ROOT_EMAILS.
  const isFirstEverUser = !existing && !pending && (await db.user.count()) === 0;

  const user = await db.user.upsert({
    where: { entraOid: (existing ?? pending)?.entraOid ?? identity.oid },
    update: {
      entraOid: identity.oid,
      name: identity.name,
      email,
      department: profile.department,
      jobTitle: profile.jobTitle,
      // Root sempre resolve para GESTOR; fora disso, o papel so muda pela tela
      // de administracao — o login nunca rebaixa quem ja foi promovido.
      ...(isRoot ? { role: "GESTOR" as const } : {}),
    },
    create: {
      entraOid: identity.oid,
      name: identity.name,
      email,
      department: profile.department,
      jobTitle: profile.jobTitle,
      role: isRoot || isFirstEverUser ? "GESTOR" : "COLABORADOR",
    },
  });

  if (!existing) {
    console.log(`[auth] novo usuario provisionado: ${user.email} (${user.role})`);
  }

  return user;
}
