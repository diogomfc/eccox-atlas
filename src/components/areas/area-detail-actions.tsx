"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteArea } from "@/app/actions/areas";
import { AreaFormDialog, type AreaFormValue } from "@/components/areas/area-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function AreaDetailActions({ area }: { area: AreaFormValue }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteArea(area.id);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível excluir a área.");
        return;
      }
      setDeleteOpen(false);
      router.push("/atlas");
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil data-icon="inline-start" />
        Editar área
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setError(null);
          setDeleteOpen(true);
        }}
      >
        <Trash2 data-icon="inline-start" className="text-destructive" />
        Excluir área
      </Button>

      <AreaFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        area={area}
        onSaved={() => router.refresh()}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{area.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {error ??
                "Esta ação não pode ser desfeita. A área só é removida se não houver processos vinculados a ela."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
