import type { UserRole } from "@/generated/prisma/client";

/**
 * Campos que o Atlas guarda no JWT, alem do que o Auth.js ja traz.
 *
 * A tentativa de aumentar `JWT` via `declare module "next-auth/jwt"` nao
 * chega ao tipo real usado dentro do callback `jwt` do Auth.js v5-beta: esse
 * tipo vem de `@auth/core/jwt`, um pacote transitivo que o pnpm nao expoe ao
 * projeto (so o `next-auth` em si e dependencia direta). Por isso `src/auth.ts`
 * faz `token as JWT & AtlasTokenFields` no proprio callback, em vez de confiar
 * em augmentation.
 */
export interface AtlasTokenFields {
  dbUserId?: string;
  role?: UserRole;
  accessToken?: string;
  refreshToken?: string;
  /** Epoch em milissegundos. */
  accessTokenExpiresAt?: number;
  error?: "RefreshFailed";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    accessToken?: string;
  }
}
