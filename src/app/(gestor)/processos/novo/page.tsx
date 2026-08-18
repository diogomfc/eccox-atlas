import type { Metadata } from "next";
import { NewProcessForm } from "@/components/processes/new-process-form";
import { listAreasForForm } from "@/lib/queries/atlas";

export const metadata: Metadata = { title: "Novo processo" };

export default async function NewProcessPage() {
  const areas = await listAreasForForm();

  return (
    <div className="container-page space-y-8 pt-10">
      <header className="space-y-2">
        <p className="label-caps">Gestão</p>
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">Novo processo</h1>
      </header>

      <div className="surface-panel max-w-xl p-6">
        <NewProcessForm areas={areas} />
      </div>
    </div>
  );
}
