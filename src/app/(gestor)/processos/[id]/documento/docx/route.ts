import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { DocumentSections } from "@/lib/documents/sections";
import { buildProcessDocx } from "@/lib/export/docx";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const document = await db.document.findFirst({
    where: { processId: id },
    orderBy: { version: "desc" },
    include: { process: { include: { area: true } } },
  });

  if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

  const buffer = await buildProcessDocx({
    processName: document.process.name,
    processCode: document.process.code,
    areaName: document.process.area.name,
    version: document.version,
    classification: document.classification,
    elaboradoPor: document.elaboradoPor,
    dataElaboracao: document.dataElaboracao,
    aprovadoPor: document.aprovadoPor,
    dataAprovacao: document.dataAprovacao,
    proximaRevisao: document.proximaRevisao,
    publicadoEm: document.publicadoEm,
    sections: document.sectionsJson as unknown as DocumentSections,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${document.process.code}.docx"`,
    },
  });
}
