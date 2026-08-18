import { type NextRequest, NextResponse } from "next/server";
import { isSessionCookieName } from "@/lib/auth/session-cookies";

/**
 * Guarda otimista das rotas internas. A sessao real e revalidada nas paginas;
 * aqui so evitamos renderizar a area logada para quem nao tem cookie de sessao.
 *
 * /entrevista/[token] agora exige login tambem: o respondente e um
 * colaborador com conta no Entra ID, e a pagina confere que quem esta logado
 * e exatamente o convidado (nao so presenca de cookie).
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((cookie) => isSessionCookieName(cookie.name));
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  // Sem isso, um cache agressivo do browser pode reproduzir este redirect a
  // partir do disco em vez de perguntar de novo ao servidor depois que o
  // cookie mudar — o sintoma e um "loop" que some so limpando cache, nao so
  // cookies.
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: [
    "/atlas/:path*",
    "/processos/:path*",
    "/entrevistas/:path*",
    "/administracao/:path*",
    "/minhas-entrevistas/:path*",
    "/entrevista/:path*",
  ],
};
