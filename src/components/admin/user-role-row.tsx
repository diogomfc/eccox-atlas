"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { updateUserRole } from "@/app/actions/users";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/generated/prisma/client";
import { USER_ROLE_LABEL } from "@/lib/domain";

interface UserRoleRowProps {
  userId: string;
  role: UserRole;
  disabled: boolean;
}

const ITEMS: Record<UserRole, string> = { GESTOR: "Gestor", COLABORADOR: "Colaborador" };

export function UserRoleSelect({ userId, role, disabled }: UserRoleRowProps) {
  const [pending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      await updateUserRole({ userId, role: next });
    });
  }

  return (
    <div className="flex items-center gap-2">
      {pending ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      <Select
        items={ITEMS}
        value={role}
        onValueChange={handleChange}
        disabled={disabled || pending}
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="GESTOR">{USER_ROLE_LABEL.GESTOR}</SelectItem>
          <SelectItem value="COLABORADOR">{USER_ROLE_LABEL.COLABORADOR}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
