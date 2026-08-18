import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProcessEditForm } from "@/components/processes/process-edit-form";
import { QuestionBuilder } from "@/components/processes/question-builder";
import { listAreasForForm } from "@/lib/queries/atlas";
import { getProcessDetail } from "@/lib/queries/processes";
import { listKnownUsers } from "@/lib/queries/users";

interface AdminProcessDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AdminProcessDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const process = await getProcessDetail(id);
  return { title: process ? `Editar — ${process.name}` : "Processo" };
}

export default async function AdminProcessDetailPage({ params }: AdminProcessDetailPageProps) {
  const { id } = await params;
  const [process, areas, users] = await Promise.all([
    getProcessDetail(id),
    listAreasForForm(),
    listKnownUsers(),
  ]);
  if (!process) notFound();

  return (
    <div className="container-page space-y-6 pt-10">
      <Link
        href={`/processos/${process.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Voltar para o processo
      </Link>

      <header className="space-y-2">
        <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[0.625rem] tracking-widest text-brand">
          {process.code}
        </span>
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">{process.name}</h1>
        <p className="text-sm text-muted-foreground">{process.area.name}</p>
      </header>

      <ProcessEditForm
        id={process.id}
        name={process.name}
        objective={process.objective}
        relatedPolicyRef={process.relatedPolicyRef}
        areaId={process.areaId}
        areas={areas}
        priority={process.priority}
        ownerId={process.ownerId}
        users={users}
      />

      <section className="space-y-4">
        <h2 className="label-caps">Roteiro da entrevista</h2>
        <QuestionBuilder processId={process.id} sections={process.sections} />
      </section>
    </div>
  );
}
