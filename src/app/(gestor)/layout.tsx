import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AppHeader } from "@/components/layout/app-header";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";

/** Tudo debaixo deste grupo é exclusivo de GESTOR — src/proxy.ts só garante sessão; o papel se confere aqui. */
export default async function GestorLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "GESTOR") redirect("/minhas-entrevistas");

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        userSlot={
          <>
            <NotificationsMenu />
            <UserMenu />
          </>
        }
        nav="gestor"
      />
      <main className="flex-1 pb-20">{children}</main>
    </div>
  );
}
