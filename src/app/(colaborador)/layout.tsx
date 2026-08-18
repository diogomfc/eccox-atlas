import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/app-header";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";

export default async function ColaboradorLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Um gestor pode ser convidado como respondente por outro gestor (o
  // self-invite é bloqueado, mas isso não impede ninguém mais de convidar) —
  // sem isso, ele ficava preso no menu de colaborador ao abrir o próprio
  // link de entrevista, sem volta pro Atlas/Administração.
  const nav = session.user.role === "GESTOR" ? "gestor" : "colaborador";

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        userSlot={
          <>
            <NotificationsMenu />
            <UserMenu />
          </>
        }
        nav={nav}
      />
      <main className="flex-1 pb-20">{children}</main>
    </div>
  );
}
