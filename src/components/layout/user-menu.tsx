import { ClipboardList, LayoutGrid, LogOut } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { UserAvatar } from "@/components/layout/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserProfile } from "@/lib/queries/users";

export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  const profile = await getUserProfile(session.user.id);
  const name = profile?.name ?? session.user.name ?? session.user.email ?? "?";
  const email = profile?.email ?? session.user.email ?? "";
  const isGestor = session.user.role === "GESTOR";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <UserAvatar name={name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 px-2 py-2">
          <UserAvatar name={name} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            {profile?.jobTitle ? (
              <p className="truncate text-xs text-muted-foreground">
                {profile.jobTitle}
                {profile.department ? ` · ${profile.department}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        {isGestor ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/atlas" />}>
              <LayoutGrid className="size-3.5" />
              Painel do gestor
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/minhas-entrevistas" />}>
              <ClipboardList className="size-3.5" />
              Minhas entrevistas
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />
        {/* <a> normal, nao <Link> nem Server Action com signOut(): precisa de
            navegacao de documento de verdade pra rota apagar cookie e
            redirecionar — Server Action stale sobrevive a HMR e quebra com
            "unexpected response" (ver comentario em api/session/clear/route.ts). */}
        <DropdownMenuItem render={<a href="/api/session/clear" />} variant="destructive">
          <LogOut className="size-3.5" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
