import "server-only";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { DocumentSectionGroup, DocumentSections } from "@/lib/documents/sections";
import { CLASSIFICATION_LABEL } from "@/lib/domain";

const BRAND = "004F67";

export interface ProcessDocxInput {
  processName: string;
  processCode: string;
  areaName: string;
  version: number;
  classification: "INTERNA_GERAL" | "INTERNA_EXCLUSIVA_AREA" | "PUBLICA";
  elaboradoPor: string;
  dataElaboracao: Date;
  aprovadoPor: string | null;
  dataAprovacao: Date | null;
  proximaRevisao: Date | null;
  publicadoEm: string;
  sections: DocumentSections;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR");

/**
 * Gera o .docx no mesmo cabeçalho e seções do "Modelo de Processo POP ECCOX -
 * V3.docx" — construído programaticamente (não é a cópia literal do arquivo
 * oficial, mas replica ordem, rótulos e numeração exatamente).
 */
export function buildProcessDocx(input: ProcessDocxInput): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: "PROCESSO — PROCEDIMENTO OPERACIONAL PADRÃO (POP)",
                color: BRAND,
                bold: true,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          headerTable(input),
          new Paragraph({ text: "" }),
          ...input.sections.flatMap((group, index) => sectionBlock(group, index)),
          ...flowSection(input.sections.length + 1),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function headerRow(label: string, value: string, label2?: string, value2?: string): TableRow {
  const cell = (text: string, bold = false, width = 25) =>
    new TableCell({
      width: { size: width, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
    });

  return new TableRow({
    children: [cell(label, true), cell(value), cell(label2 ?? "", true), cell(value2 ?? "")],
  });
}

function headerTable(input: ProcessDocxInput): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      headerRow("Nome", input.processName, "Código", input.processCode),
      headerRow("Área", input.areaName, "Versão", `v${input.version}.0`),
      headerRow(
        "Elaborado por (Faz)",
        input.elaboradoPor,
        "Data elaboração",
        dateFormatter.format(input.dataElaboracao),
      ),
      headerRow(
        "Classificação",
        CLASSIFICATION_LABEL[input.classification],
        "Próxima revisão",
        input.proximaRevisao ? dateFormatter.format(input.proximaRevisao) : "",
      ),
      headerRow(
        "Aprovado por",
        input.aprovadoPor ?? "",
        "Data aprovação",
        input.dataAprovacao ? dateFormatter.format(input.dataAprovacao) : "",
      ),
      headerRow(
        "Publicado em (Publica)",
        input.publicadoEm,
        "Responsável do POP",
        input.elaboradoPor,
      ),
    ],
  });
}

function sectionBlock(group: DocumentSectionGroup, index: number): Paragraph[] {
  const items = group.items;
  const heading = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: `${index + 1}. ${group.label.toUpperCase()}`, color: BRAND })],
  });

  if (items.length === 0) {
    return [
      heading,
      new Paragraph({ children: [new TextRun({ text: "Não preenchido.", italics: true })] }),
    ];
  }

  return [
    heading,
    ...items.flatMap((item) => [
      new Paragraph({ children: [new TextRun({ text: item.questionText, bold: true })] }),
      ...item.text.split("\n").map((line) => new Paragraph({ text: line })),
      new Paragraph({ text: "" }),
    ]),
  ];
}

function flowSection(index: number): Paragraph[] {
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      children: [new TextRun({ text: `${index}. DESENHO DO PROCESSO (FLUXO)`, color: BRAND })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "O diagrama do fluxo, gerado automaticamente a partir dos Passos, está disponível na aba Fluxo do ECCOX Atlas.",
          italics: true,
        }),
      ],
    }),
  ];
}
