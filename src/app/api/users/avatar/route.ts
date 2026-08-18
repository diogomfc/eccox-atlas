import { auth } from "@/auth";

/**
 * Proxy da foto do próprio usuário logado via Microsoft Graph — busca sob
 * demanda a cada request, nunca embute no JWT/cookie (foi a causa raiz do
 * bug de fragmentação de cookie de sessão, ver src/auth.ts). Só funciona
 * para o próprio usuário (`/me/photo`); outros usuários exigiriam
 * `User.Read.All`, mesma trava do diretório completo.
 */
export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return new Response(null, { status: 404 });
  }

  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok || !response.body) {
      return new Response(null, { status: 404 });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "image/jpeg",
        // nao cachear: a URL e sempre a mesma pra qualquer usuario logado — um
        // cache por max-age serviria a foto de quem estava logado antes pra
        // quem logar depois na mesma maquina/navegador (bug real, ja visto:
        // trocar de conta manteve o avatar da sessao anterior).
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
