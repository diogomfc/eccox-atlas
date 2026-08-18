import type { Metadata } from "next";
import { AreaGrid } from "@/components/atlas/area-grid";
import { WaveBar } from "@/components/atlas/wave-bar";
import { NewProcessDialog } from "@/components/processes/new-process-dialog";
import { getAtlasOverview, listAreasForForm } from "@/lib/queries/atlas";

export const metadata: Metadata = { title: "Atlas" };

export default async function AtlasPage() {
  const [{ areas, totals }, areaOptions] = await Promise.all([
    getAtlasOverview(),
    listAreasForForm(),
  ]);
  const pending = totals.processes - totals.covered;

  return (
    <div className="container-page space-y-10 pt-12">
      <header className="max-w-2xl space-y-3">
        <p className="label-caps">Projeto de Transformação Organizacional</p>
        <h1 className="text-gradient-brand text-[2rem] leading-10 font-semibold tracking-tight">
          O mapa vivo da operação ECCOX
        </h1>
        <p className="text-muted-foreground">
          {totals.areas} áreas e {totals.processes} processos priorizados pelo board. Entreviste
          cada área para transformar o catálogo em POPs oficiais.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Áreas mapeadas" value={totals.areas} />
        <StatTile label="Processos" value={totals.processes} />
        <StatTile label="Aprovados" value={totals.covered} hint={`${pending} aguardando`} />
      </section>

      <section className="surface-panel space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold tracking-tight">Fila de execução por onda</h2>
          <p className="text-xs text-muted-foreground">
            Onda 1 é a fila prioritária definida na V6 do board
          </p>
        </div>
        <WaveBar waves={totals.waves} />
      </section>

      <AreaGrid areas={areas} actions={<NewProcessDialog areas={areaOptions} />} />
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="surface-panel p-5">
      <p className="label-caps">{label}</p>
      <p className="mt-1 font-mono text-[2rem] leading-10 tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
