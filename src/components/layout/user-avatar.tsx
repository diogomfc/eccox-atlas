import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Foto do Entra ID via /api/users/avatar (só existe para o próprio usuário
 * logado) — cai para as iniciais (shadcn AvatarFallback) se não houver foto
 * ou a busca falhar. */
export function UserAvatar({ name, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-7 text-xs", className)} title={name}>
      <AvatarImage src="/api/users/avatar" alt={name} />
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
