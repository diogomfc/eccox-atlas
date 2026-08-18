import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaDetailActions } from "@/components/areas/area-detail-actions";
import { InviteDialog } from "@/components/atlas/invite-dialog";
import { ProcessList } from "@/components/atlas/process-list";
import { WaveBar } from "@/components/atlas/wave-bar";
import { NewProcessDialog } from "@/components/processes/new-process-dialog";
import type { Wave } from "@/generated/prisma/client";
import { getAreaDetail, listAreaCodes } from "@/lib/queries/atlas";

interface AreaPageProps {
  params: Promise<{ area: string }>;
}

export async function generateStaticParams() {
  const codes = await listAreaCodes();
  return codes.map((area) => ({ area }));
}

export async function generateMetadata({ params }: AreaPageProps): Promise<Metadata> {
  const { area: code } = await params;
  const area = await getAreaDetail(code);
  return { title: area?.name ?? "Área" };
}

export default async function AreaPage({ params }: AreaPageProps) {
  const { area: code } = await params;
  const area = await getAreaDetail(code);
  if (!area) notFound();

  const waves = area.processes.reduce<Record<Wave, number>>(
    (acc, processItem) => {
      acc[processItem.wave] += 1;
      return acc;
    },
    { ONDA_1: 0, ONDA_2: 0, ONDA_3: 0, CONCLUIDO: 0 },
  );

  return (
    <div className="container-page space-y-10 pt-10">
      <Link
        href="/atlas"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Atlas
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[0.625rem] tracking-widest text-brand">
            {area.sigla}
          </span>
          <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">{area.name}</h1>
          <p className="text-sm text-muted-foreground">
            Dono da área: {area.ownerName ?? "a definir"}
            {area.ownerEmail ? ` · ${area.ownerEmail}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AreaDetailActions area={{ id: area.id, name: area.name, ownerId: area.ownerId }} />
          {area.processes.length > 0 ? <InviteDialog processes={area.processes} /> : null}
          <NewProcessDialog areas={[{ id: area.id, name: area.name, sigla: area.sigla }]} />
        </div>
      </header>

      <section className="surface-panel space-y-3 p-5">
        <h2 className="text-base font-semibold tracking-tight">Distribuição por onda</h2>
        <WaveBar waves={waves} />
      </section>

      <ProcessList processes={area.processes} areaFrom={area.code} />
    </div>
  );
}
