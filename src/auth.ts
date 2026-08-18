import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { isEntraAuthEnabled, isEntraDirectoryEnabled } from "@/lib/auth/entra-enabled";
import { refreshEntraAccessToken } from "@/lib/auth/entra-graph";
import { findMockUser } from "@/lib/auth/mock-users";
import { provisionUser } from "@/lib/auth/provision";
import { db } from "@/lib/db";
import type { AtlasTokenFields } from "@/types/next-auth";

/**
 * O provider mantem o id "microsoft" de proposito: o Redirect URI
 * /api/auth/callback/microsoft ja esta homologado com a TI da ECCOX no
 * eci-studio-frontend, e reutiliza-lo evita abrir chamado para um novo URI.
 *
 * `User.Read.All` e uma permissao restrita — sem consentimento previo de um
 * admin do tenant, pedi-la no login trava o login inteiro pra todo mundo (o
 * Entra recusa o consentimento em vez de so negar aquele escopo). Por isso
 * so entra no pedido quando NEXT_PUBLIC_ENTRA_DIRECTORY_ENABLED=true — liga
 * separado do login basico, depois que o TI confirmar o consentimento. Ver
 * src/lib/auth/entra-enabled.ts.
 */
const entraProvider = MicrosoftEntraID({
  id: "microsoft",
  clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
  clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
  authorization: {
    params: {
      scope: `openid profile email offline_access User.Read${
        isEntraDirectoryEnabled() ? " User.Read.All" : ""
      }`,
    },
  },
  // O profile() padrao busca a foto do Graph e embute como base64 no
  // resultado — jogado no JWT, isso sozinho ja passa de 4KB e faz o Auth.js
  // fragmentar o cookie de sessao em authjs.session-token.0/.1/.2. O Atlas
  // nao usa avatar do Entra em lugar nenhum, entao nem busca.
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: null,
    };
  },
});

/** Fallback local: escolhe um dos usuarios mock, sem senha. */
const mockProvider = Credentials({
  id: "mock",
  name: "Usuário de desenvolvimento",
  credentials: { userId: { label: "Usuário", type: "text" } },
  authorize(credentials) {
    const user = findMockUser(String(credentials?.userId ?? ""));
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email };
  },
});

/**
 * Em desenvolvimento, o login mock fica disponivel mesmo com o Entra ligado —
 * sem ele nao ha como testar o app localmente sem credenciais reais da ECCOX.
 * Em producao (`NODE_ENV=production`) so o Entra e registrado.
 */
const providers =
  process.env.NODE_ENV === "production"
    ? [entraProvider]
    : isEntraAuthEnabled()
      ? [entraProvider, mockProvider]
      : [mockProvider];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    // O tipo `JWT` do callback vem de `@auth/core/jwt`, um pacote transitivo
    // que o pnpm nao expoe ao projeto — a augmentation em src/types/next-auth.d.ts
    // nao alcanca esse tipo, entao o cast local e o jeito confiavel de anexar
    // os campos do Atlas. Ver o comentario em AtlasTokenFields.
    async jwt({ token: rawToken, account, profile, user }) {
      const token = rawToken as typeof rawToken & AtlasTokenFields;

      // Login mock: sem OAuth. Provisiona o mesmo User de sempre no banco, para
      // que convites/entrevistas tenham uma referencia real de usuario.
      if (account?.provider === "mock" && user?.id) {
        const mock = findMockUser(user.id);
        if (mock) {
          const record = await db.user.upsert({
            where: { entraOid: `mock:${mock.id}` },
            update: {},
            create: {
              entraOid: `mock:${mock.id}`,
              name: mock.name,
              email: mock.email,
              department: mock.department,
              jobTitle: mock.jobTitle,
              role: mock.role,
            },
          });
          token.dbUserId = record.id;
          token.role = record.role;
        }
        return token;
      }

      if (account?.provider === "microsoft" && profile) {
        // Login inicial: provisiona o usuario e guarda os tokens do Entra.
        const oid = String(profile.sub ?? profile.oid ?? token.sub ?? "");
        const email = String(profile.email ?? profile.preferred_username ?? "");
        const name = String(profile.name ?? email);

        const user = await provisionUser({
          oid,
          email,
          name,
          accessToken: account.access_token,
        });

        token.dbUserId = user.id;
        token.role = user.role;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
        return token;
      }

      // Requisicoes seguintes: token de acesso ainda valido, nada a fazer.
      if (token.accessTokenExpiresAt && Date.now() < token.accessTokenExpiresAt - 60_000) {
        return token;
      }

      // Expirado (ou perto disso): renova com o refresh token.
      if (!token.refreshToken) return token;

      try {
        const refreshed = await refreshEntraAccessToken(token.refreshToken);
        token.accessToken = refreshed.accessToken;
        token.refreshToken = refreshed.refreshToken;
        token.accessTokenExpiresAt = refreshed.expiresAt;
        token.error = undefined;
      } catch (error) {
        console.error("[auth] falha ao renovar token do Entra ID:", error);
        token.error = "RefreshFailed";
      }

      return token;
    },

    session({ session, token: rawToken }) {
      const token = rawToken as typeof rawToken & AtlasTokenFields;
      if (token.dbUserId) session.user.id = token.dbUserId;
      if (token.role) session.user.role = token.role;
      session.accessToken = token.accessToken;
      return session;
    },
  },
});
