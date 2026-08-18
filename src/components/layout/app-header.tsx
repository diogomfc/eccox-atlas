"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** Acompanhamento operacional — o dia a dia de mapear e revisar processos. */
const GESTOR_NAV_OPERACIONAL = [
  { href: "/atlas", label: "Atlas" },
  { href: "/processos", label: "Processos" },
  { href: "/entrevistas", label: "Entrevistas" },
] as const;

/** Gestão/CRUD — estrutura por trás do que aparece no operacional. */
const GESTOR_NAV_ADMIN = [
  { href: "/administracao/areas", label: "Áreas" },
  { href: "/administracao/usuarios", label: "Usuários" },
] as const;

export function AppHeader({
  userSlot,
  nav,
}: {
  userSlot?: ReactNode;
  nav: "gestor" | "colaborador";
}) {
  const pathname = usePathname();
  const homeHref = nav === "gestor" ? "/atlas" : "/minhas-entrevistas";
  // /administracao/processos/[id] (editar estrutura e roteiro) continua existindo
  // mesmo sem item próprio no dropdown — pathname.startsWith cobre ele também.
  const adminActive = pathname.startsWith("/administracao");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="container-page grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Link href={homeHref} className="flex items-center gap-2.5 justify-self-start">
          <Logo shape="icon" className="h-6" />
          <span className="text-sm font-semibold tracking-tight">
            Atlas
            <span className="ml-1.5 font-mono text-[0.625rem] tracking-widest text-muted-foreground">
              ECCOX
            </span>
          </span>
        </Link>

        {nav === "gestor" ? (
          <nav className="flex items-center gap-1 justify-self-center">
            {GESTOR_NAV_OPERACIONAL.map((item) => (
              <NavLink key={item.href} href={item.href} pathname={pathname} label={item.label} />
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  adminActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Administração
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {GESTOR_NAV_ADMIN.map((item) => (
                  <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 justify-self-end">
          <ThemeToggle />
          {userSlot}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, pathname, label }: { href: string; pathname: string; label: string }) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href as Parameters<typeof Link>[0]["href"]}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
