import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { generateAiFirstFlow } from "@/app/actions/flow-suggestion";
import { DocumentReader } from "@/components/documents/document-reader";
import { PrintButton } from "@/components/documents/print-button";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { FlowEdgeData, FlowNodeData } from "@/lib/documents/flow";
import type { DocumentSections } from "@/lib/documents/sections";
import { cn } from "@/lib/utils";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Documento" };

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;

  const document = await db.document.findFirst({
    where: { processId: id },
    orderBy: { version: "desc" },
    include: { process: { include: { area: true } }, flows: true },
  });
  if (!document) notFound();

  const asIsFlowRow = document.flows.find((item) => item.kind === "AS_IS");
  const toBeFlowRow = document.flows.find((item) => item.kind === "TO_BE");
  const flow = asIsFlowRow
    ? {
        nodes: asIsFlowRow.nodesJson as unknown as FlowNodeData[],
        edges: asIsFlowRow.edgesJson as unknown as FlowEdgeData[],
      }
    : null;
  const flowToBe = toBeFlowRow
    ? {
        nodes: toBeFlowRow.nodesJson as unknown as FlowNodeData[],
        edges: toBeFlowRow.edgesJson as unknown as FlowEdgeData[],
        rationale: toBeFlowRow.rationale,
      }
    : null;

  return (
    <div>
      <div className="no-print container-page flex items-center justify-between pt-6">
        <Link
          href={`/processos/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {document.process.name}
        </Link>

        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/processos/${id}/documento/docx`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Baixar .docx
          </a>
        </div>
      </div>

      <DocumentReader
        processName={document.process.name}
        processCode={document.process.code}
        areaName={document.process.area.name}
        version={document.version}
        classification={document.classification}
        elaboradoPor={document.elaboradoPor}
        dataElaboracao={document.dataElaboracao}
        aprovadoPor={document.aprovadoPor}
        dataAprovacao={document.dataAprovacao}
        publicadoEm={document.publicadoEm}
        sections={document.sectionsJson as unknown as DocumentSections}
        flow={flow}
        flowToBe={flowToBe}
        canGenerateFlow={document.process.status === "APROVADO"}
        onGenerateFlow={
          document.process.status === "APROVADO"
            ? generateAiFirstFlow.bind(null, document.process.id)
            : undefined
        }
      />
    </div>
  );
}
