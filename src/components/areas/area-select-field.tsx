"use client";

import { Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AreaManageDialog } from "@/components/areas/area-manage-dialog";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";

interface AreaOption {
  id: string;
  name: string;
  sigla: string;
}

interface AreaSelectFieldProps {
  areas: AreaOption[];
  value: string;
  onValueChange: (areaId: string) => void;
  label?: string;
}

/** Select de Área reusado no cadastro/edição de processo — pesquisável
 * (Command), com o atalho "Gerenciar áreas" fixo no rodapé da lista. Abre o
 * modal de gestão por cima, sem navegar, então o resto do form não perde o
 * que já foi preenchido. */
export function AreaSelectField({
  areas,
  value,
  onValueChange,
  label = "Área",
}: AreaSelectFieldProps) {
  const router = useRouter();
  const [manageOpen, setManageOpen] = useState(false);

  const options = areas.map((area) => ({ value: area.id, label: `${area.sigla} — ${area.name}` }));

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Combobox
        options={options}
        value={value}
        onValueChange={onValueChange}
        placeholder="Selecione uma área"
        searchPlaceholder="Buscar área…"
        emptyText="Nenhuma área encontrada."
        footer={(close) => (
          <button
            type="button"
            onClick={() => {
              close();
              setManageOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
          >
            <Settings2 className="size-3.5" />
            Gerenciar áreas
          </button>
        )}
      />

      <AreaManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        onAreasChanged={() => router.refresh()}
      />
    </div>
  );
}
