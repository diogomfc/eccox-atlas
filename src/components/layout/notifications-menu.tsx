import { Bell, ClipboardList, FileClock } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotificationSummary } from "@/lib/queries/notifications";

export async function NotificationsMenu() {
  const session = await auth();
  if (!session?.user) return null;

  const summary = await getNotificationSummary(session.user.id, session.user.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notificações"
        className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-4" />
        {summary.totalCount > 0 ? (
          <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.5625rem] font-semibold text-destructive-foreground">
            {summary.totalCount > 9 ? "9+" : summary.totalCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {summary.totalCount === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            Nenhuma pendência agora.
          </p>
        ) : (
          <>
            {summary.myPending.length > 0 ? (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-1.5">
                  <ClipboardList className="size-3.5" />
                  Suas entrevistas
                </DropdownMenuLabel>
                {summary.myPending.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    render={<Link href={item.href as Parameters<typeof Link>[0]["href"]} />}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">
                        <span className="font-mono text-brand">{item.processCode}</span>{" "}
                        {item.processName}
                      </p>
                      <p className="text-[0.6875rem] text-muted-foreground">{item.detail}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ) : null}

            {summary.awaitingApproval.length > 0 ? (
              <>
                {summary.myPending.length > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-1.5">
                    <FileClock className="size-3.5" />
                    Aguardando sua aprovação
                  </DropdownMenuLabel>
                  {summary.awaitingApproval.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      render={<Link href={item.href as Parameters<typeof Link>[0]["href"]} />}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs">
                          <span className="font-mono text-brand">{item.processCode}</span>{" "}
                          {item.processName}
                        </p>
                        <p className="text-[0.6875rem] text-muted-foreground">{item.detail}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
