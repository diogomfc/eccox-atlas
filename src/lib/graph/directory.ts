import "server-only";

/**
 * Diretorio completo de colaboradores via Microsoft Graph, usando o token
 * delegado do gestor logado. So funciona quando o login pediu o escopo
 * `User.Read.All` — ver NEXT_PUBLIC_ENTRA_DIRECTORY_ENABLED em
 * src/lib/auth/entra-enabled.ts. Sem isso (ou se o Graph recusar por falta de
 * consentimento do admin do tenant), o chamador deve cair para
 * src/lib/queries/users.ts (colaboradores ja conhecidos) + convite por e-mail.
 */
export interface DirectoryUser {
  entraOid: string;
  name: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
}

interface GraphUsersPage {
  value: Array<{
    id: string;
    displayName: string;
    mail: string | null;
    userPrincipalName: string;
    department: string | null;
    jobTitle: string | null;
  }>;
  "@odata.nextLink"?: string;
}

const SELECT = "id,displayName,mail,userPrincipalName,department,jobTitle";
const PAGE_SIZE = 50;

/**
 * Busca ate `limit` colaboradores cujo nome ou e-mail bate com `query`.
 * Lanca em caso de erro — o chamador decide o fallback (ver acima).
 */
export async function searchDirectory(
  accessToken: string,
  query: string,
  limit = 20,
): Promise<DirectoryUser[]> {
  const filterable = query.trim().replace(/'/g, "''");
  const filter = filterable
    ? `startswith(displayName,'${filterable}') or startswith(mail,'${filterable}')`
    : undefined;

  const url = new URL("https://graph.microsoft.com/v1.0/users");
  url.searchParams.set("$select", SELECT);
  url.searchParams.set("$top", String(Math.min(limit, PAGE_SIZE)));
  if (filter) url.searchParams.set("$filter", filter);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // $filter com startswith exige contagem avancada no Graph.
      ConsistencyLevel: "eventual",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Graph /users respondeu HTTP ${response.status}`);
  }

  const body = (await response.json()) as GraphUsersPage;

  return body.value
    .filter((user) => user.mail)
    .slice(0, limit)
    .map((user) => ({
      entraOid: user.id,
      name: user.displayName,
      email: (user.mail ?? user.userPrincipalName).toLowerCase(),
      department: user.department,
      jobTitle: user.jobTitle,
    }));
}
