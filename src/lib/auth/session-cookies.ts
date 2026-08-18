/**
 * Nomes-base dos cookies de sessao do Auth.js. Quando o JWT passa de ~4KB
 * (aconteceu com sessoes reais do Entra ID, que carregam accessToken +
 * refreshToken), o Auth.js fragmenta em "authjs.session-token.0", ".1", ".2"
 * etc — qualquer checagem de cookie de sessao tem que casar por prefixo, não
 * só pelo nome exato. Usado em src/proxy.ts, src/app/login/page.tsx e
 * src/app/api/session/clear/route.ts — mantenha os três em sincronia com isto.
 */
export const SESSION_COOKIE_PREFIXES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function isSessionCookieName(name: string): boolean {
  return SESSION_COOKIE_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}.`));
}
