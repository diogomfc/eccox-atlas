import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { isEntraAuthEnabled } from "@/lib/auth/entra-enabled";
import { MOCK_USERS } from "@/lib/auth/mock-users";
import { safeRedirectTo } from "@/lib/auth/safe-redirect";
import { isSessionCookieName } from "@/lib/auth/session-cookies";

export const metadata: Metadata = { title: "Entrar" };
// Nunca cachear: uma versao antiga desta pagina servida do disco/bfcache do
// browser pode reproduzir um redirect que nao vale mais.
export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo: rawRedirectTo } = await searchParams;
  const redirectTo = safeRedirectTo(rawRedirectTo);

  const session = await auth();
  if (session) redirect(redirectTo as Parameters<typeof redirect>[0]);

  // Cookie presente mas auth() nao conseguiu decodificar: sessao de outra
  // porta/ambiente, ou corrompida. Limpa e recarrega em vez de deixar esse
  // cookie morto voltar a cada request.
  const store = await cookies();
  const hasStaleCookie = store.getAll().some((cookie) => isSessionCookieName(cookie.name));
  if (hasStaleCookie) redirect("/api/session/clear");

  const entraEnabled = isEntraAuthEnabled();
  // Em dev, o login mock convive com o Entra real — ver src/auth.ts. Em
  // produção só o Entra é registrado como provider.
  const showMock = process.env.NODE_ENV !== "production";

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="surface-panel glow-brand w-full max-w-sm space-y-6 p-8">
        <Logo className="h-7" />

        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">ECCOX Atlas</h1>
          <p className="text-sm text-muted-foreground">
            O mapa vivo da operação. Entre com a sua conta corporativa para continuar.
          </p>
        </div>

        {entraEnabled ? (
          <form
            action={async () => {
              "use server";
              await signIn("microsoft", { redirectTo });
            }}
          >
            <Button type="submit" size="lg" className="w-full">
              Entrar com Microsoft
            </Button>
          </form>
        ) : null}

        {showMock ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {entraEnabled
                ? "Ambiente de desenvolvimento — atalho sem passar pelo Entra ID."
                : "Entra ID desligado neste ambiente. Escolha um usuário de desenvolvimento."}
            </p>
            {MOCK_USERS.map((user) => (
              <form
                key={user.id}
                action={async () => {
                  "use server";
                  await signIn("mock", { userId: user.id, redirectTo });
                }}
              >
                <Button type="submit" variant="outline" size="lg" className="w-full justify-start">
                  {user.name}
                  <span className="ml-auto text-xs text-muted-foreground">{user.department}</span>
                </Button>
              </form>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
