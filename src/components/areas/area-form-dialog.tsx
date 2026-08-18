"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createArea, updateArea } from "@/app/actions/areas";
import { listUserOptions } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type UserOption, UserPicker } from "@/components/users/user-picker";

export interface AreaFormValue {
  id: string;
  name: string;
  ownerId: string | null;
}

interface AreaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: AreaFormValue | null;
  onSaved: () => void;
}

export function AreaFormDialog({ open, onOpenChange, area, onSaved }: AreaFormDialogProps) {
  const [name, setName] = useState(area?.name ?? "");
  const [ownerId, setOwnerId] = useState<string | null>(area?.ownerId ?? null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset só quando o modal abre
  useEffect(() => {
    if (!open) return;
    setName(area?.name ?? "");
    setOwnerId(area?.ownerId ?? null);
    setError(null);
    listUserOptions().then(setUsers);
  }, [open]);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = area
        ? await updateArea({ id: area.id, name, ownerId: ownerId ?? undefined })
        : await createArea({ name, ownerId: ownerId ?? undefined });
      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar a área.");
        return;
      }
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{area ? "Editar área" : "Nova área"}</DialogTitle>
          <DialogDescription>
            {area
              ? "Atualize o nome ou o responsável desta área."
              : "Cadastre uma área/departamento nova."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="area-name">Nome da área</Label>
            <Input id="area-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label>Responsável pela área</Label>
            <UserPicker
              users={users}
              value={ownerId}
              onChange={(id, user) => {
                setOwnerId(id);
                if (user && !users.some((existing) => existing.id === user.id)) {
                  setUsers((prev) => [...prev, user]);
                }
              }}
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !name.trim()}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
