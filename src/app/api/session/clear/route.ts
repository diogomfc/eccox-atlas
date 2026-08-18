import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { safeRedirectTo } from "@/lib/auth/safe-redirect";
import { isSessionCookieName } from "@/lib/auth/session-cookies";

const OTHER_AUTH_COOKIES = ["authjs.csrf-token", "__Host-authjs.csrf-token", "authjs.callback-url"];

/**
 * Apaga qualquer cookie de sessao do Auth.js (inclusive fragmentado em
 * .0/.1/.2) e volta pro login. Usado tanto na recuperacao de cookie corrompido
 * (login/page.tsx) quanto como o proprio mecanismo de logout (user-menu.tsx,
 * entrevista/[token]/page.tsx) — `signOut()` do Auth.js e uma Server Action, e
 * uma Server Action stale/rejeitada pelo dev server em HMR quebra com "unexpected
 * response"; uma Route Handler simples nao tem esse problema. Aceita
 * `?redirectTo=` opcional pra voltar pra um destino especifico (ex: refazer
 * login como outra conta no link de entrevista). Rota (nao Server Action)
 * porque mutar cookie fora de uma Route Handler/Server Action e proibido no
 * App Router.
 */
export async function GET(request: Request) {
  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (isSessionCookieName(cookie.name) || OTHER_AUTH_COOKIES.includes(cookie.name)) {
      store.delete(cookie.name);
    }
  }

  const requestUrl = new URL(request.url);
  const redirectTo = safeRedirectTo(requestUrl.searchParams.get("redirectTo"), "/login");
  const url = new URL(redirectTo, request.url);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
