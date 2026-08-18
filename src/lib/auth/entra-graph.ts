import "server-only";

/**
 * Enriquecimento do perfil do proprio usuario logado, via Microsoft Graph.
 * So precisa do escopo delegado padrao (`User.Read`), sem consentimento extra —
 * diferente do diretorio completo em src/lib/graph/directory.ts, que precisa de
 * `User.Read.All`.
 */
export interface OwnProfile {
  department: string | null;
  jobTitle: string | null;
}

export async function fetchOwnProfile(accessToken: string): Promise<OwnProfile> {
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me?$select=department,jobTitle",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok) return { department: null, jobTitle: null };

    const body = (await response.json()) as { department?: string; jobTitle?: string };
    return { department: body.department ?? null, jobTitle: body.jobTitle ?? null };
  } catch (error) {
    console.warn("[auth] falha ao enriquecer perfil via Graph /me:", error);
    return { department: null, jobTitle: null };
  }
}

const TOKEN_ENDPOINT_SUFFIX = "/oauth2/v2.0/token";

/** Deriva o endpoint de token a partir do issuer (…/v2.0). */
function tokenEndpoint(): string {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";
  return `${issuer.replace(/\/v2\.0\/?$/, "")}${TOKEN_ENDPOINT_SUFFIX}`;
}

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/** Troca o refresh token por um novo par de tokens junto ao Entra ID. */
export async function refreshEntraAccessToken(refreshToken: string): Promise<RefreshedTokens> {
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "";
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "";

  const response = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao renovar token do Entra ID: HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: body.access_token,
    // O Entra as vezes nao devolve um refresh_token novo — mantem o anterior.
    refreshToken: body.refresh_token ?? refreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
}
