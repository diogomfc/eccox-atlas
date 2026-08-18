"use client";

import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteArea, listAreasForManagement } from "@/app/actions/areas";
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
import { Input } from "@/components/ui/input";

interface AreaRow {
  id: string;
  name: string;
  ownerId: string | null;
  ownerName: string | null;
  owner: { name: string } | null;
  _count: { processes: number };
}

interface AreaTableProps {
  /** Chamado sempre que uma área é criada, editada ou removida — quem
   * embrulha esta tabela (modal ou página) pode recarregar dados próprios. */
  onAreasChanged?: () => void;
}

/**
 * CRUD de área — lista com busca, criar/editar (`AreaFormDialog`) e excluir
 * com dupla confirmação (bloqueado se houver processo vinculado). Sem Dialog
 * próprio: usado tanto direto numa página (`/administracao/areas`) quanto
 * dentro de um modal (`AreaManageDialog`, atalho no form de processo).
 */
export function AreaTable({ onAreasChanged }: AreaTableProps) {
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AreaFormValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AreaRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function reload() {
    listAreasForManagement().then((rows) => {
      setAreas(rows as unknown as AreaRow[]);
      setLoaded(true);
    });
    onAreasChanged?.();
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: só recarrega ao montar
  useEffect(() => {
    reload();
  }, []);

  const filteredAreas = areas.filter((area) =>
    area.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    const result = await deleteArea(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "Não foi possível excluir a área.");
      return;
    }
    setDeleteTarget(null);
    reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar área por nome"
            className="pl-8"
          />
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus data-icon="inline-start" />
          Nova área
        </Button>
      </div>

      <ul className="space-y-1.5">
        {filteredAreas.map((area) => (
          <li key={area.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{area.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {area.owner?.name ?? area.ownerName ?? "Sem responsável"} · {area._count.processes}{" "}
                processo(s)
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Editar área"
              onClick={() => {
                setEditing({ id: area.id, name: area.name, ownerId: area.ownerId });
                setFormOpen(true);
              }}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Excluir área"
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget(area);
              }}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </li>
        ))}
        {loaded && filteredAreas.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {areas.length === 0 ? "Nenhuma área cadastrada ainda." : "Nenhuma área encontrada."}
          </p>
        ) : null}
      </ul>

      <AreaFormDialog open={formOpen} onOpenChange={setFormOpen} area={editing} onSaved={reload} />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ??
                "Esta ação não pode ser desfeita. A área só é removida se não houver processos vinculados a ela."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
