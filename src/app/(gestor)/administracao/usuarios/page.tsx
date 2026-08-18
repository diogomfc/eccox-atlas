import type { Metadata } from "next";
import { auth } from "@/auth";
import { UserRoleSelect } from "@/components/admin/user-role-row";
import { UserAvatar } from "@/components/layout/user-avatar";
import { USER_ROLE_LABEL } from "@/lib/domain";
import { listKnownUsers } from "@/lib/queries/users";

export const metadata: Metadata = { title: "Administração de usuários" };

export default async function UsersAdminPage() {
  const session = await auth();
  const users = await listKnownUsers();

  return (
    <div className="container-page space-y-8 pt-10">
      <header className="space-y-2">
        <p className="label-caps">Administração</p>
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Todo mundo que já entrou no Atlas, ou que já foi convidado para uma entrevista. Gestor tem
          acesso total; Colaborador só vê as próprias entrevistas.
        </p>
      </header>

      <section className="surface-panel divide-y divide-border">
        {users.map((user) => (
          <div key={user.id} className="flex flex-wrap items-center gap-4 p-4">
            {user.id === session?.user.id ? (
              <UserAvatar name={user.name} className="size-9" />
            ) : (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
                title="Foto só disponível para o usuário logado — outros dependem de permissão de diretório que ainda não foi concedida pelo TI"
              >
                {initials(user.name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.name}
                {user.isPending ? (
                  <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[0.625rem] text-muted-foreground">
                    convidado, ainda não logou
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
                {user.department ? ` · ${user.department}` : ""}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{USER_ROLE_LABEL[user.role]}</span>
            <UserRoleSelect
              userId={user.id}
              role={user.role}
              disabled={user.id === session?.user.id}
            />
          </div>
        ))}
      </section>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
