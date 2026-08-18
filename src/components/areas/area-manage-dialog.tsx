"use client";

import { AreaTable } from "@/components/areas/area-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AreaManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado sempre que uma área é criada, editada ou removida — o formulário
   * que abriu este modal deve recarregar sua própria lista de áreas. */
  onAreasChanged: () => void;
}

export function AreaManageDialog({ open, onOpenChange, onAreasChanged }: AreaManageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar áreas</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <AreaTable onAreasChanged={onAreasChanged} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
