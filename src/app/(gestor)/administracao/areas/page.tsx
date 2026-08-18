import type { Metadata } from "next";
import { AreaTable } from "@/components/areas/area-table";

export const metadata: Metadata = { title: "Áreas" };

export default function AreasAdminPage() {
  return (
    <div className="container-page space-y-8 pt-10">
      <header className="space-y-2">
        <p className="label-caps">Administração</p>
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">Áreas</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre áreas/departamentos e o responsável de cada uma. Uma área só pode ser excluída se
          não houver processo vinculado a ela.
        </p>
      </header>

      <div className="surface-panel p-5">
        <AreaTable />
      </div>
    </div>
  );
}
