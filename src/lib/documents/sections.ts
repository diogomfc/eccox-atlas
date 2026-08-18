import { AnswerSchema, answerToFlowSteps, answerToText, type Step } from "@/lib/interview/answers";

/**
 * Formato de `Document.sectionsJson` — um grupo por `ProcessSection`, cada um
 * com as perguntas respondidas daquele grupo. Seções são dinâmicas por
 * processo (o gestor cria/renomeia grupos livremente), então a montagem não
 * assume nenhum grupo fixo — só identifica os Passos estruturalmente (o
 * grupo que contém a pergunta do tipo STEPS) para o desenho automático.
 */
export interface DocumentSectionItem {
  questionText: string;
  text: string;
}

export interface DocumentSectionGroup {
  sectionId: string;
  label: string;
  order: number;
  items: DocumentSectionItem[];
}

export type DocumentSections = DocumentSectionGroup[];

interface AnsweredQuestion {
  question: {
    id: string;
    sectionId: string;
    order: number;
    questionText: string;
    isFlowSource: boolean;
    section: { label: string; order: number };
  };
  valueJson: unknown;
}

export function buildSections(answers: AnsweredQuestion[]): DocumentSections {
  const groups = new Map<string, DocumentSectionGroup>();

  const ordered = [...answers].sort((a, b) => {
    const sectionDiff = a.question.section.order - b.question.section.order;
    return sectionDiff !== 0 ? sectionDiff : a.question.order - b.question.order;
  });

  for (const item of ordered) {
    const parsed = AnswerSchema.safeParse(item.valueJson);
    const text = parsed.success ? answerToText(parsed.data) : "";
    if (!text) continue;

    const sectionId = item.question.sectionId;
    let group = groups.get(sectionId);
    if (!group) {
      group = {
        sectionId,
        label: item.question.section.label,
        order: item.question.section.order,
        items: [],
      };
      groups.set(sectionId, group);
    }
    group.items.push({ questionText: item.question.questionText, text });
  }

  return [...groups.values()].sort((a, b) => a.order - b.order);
}

/** Extrai os Passos (para o desenho automático) da pergunta marcada como
 * fonte do fluxo — qualquer grupo, tipo `list` ou `steps` (ver `isFlowSource`
 * em `ProcessQuestion` e `answerToFlowSteps`). */
export function extractSteps(answers: AnsweredQuestion[]): Step[] {
  const flowSourceAnswer = answers.find((item) => item.question.isFlowSource);
  if (!flowSourceAnswer) return [];

  const parsed = AnswerSchema.safeParse(flowSourceAnswer.valueJson);
  return parsed.success ? answerToFlowSteps(parsed.data) : [];
}

/**
 * O gatilho é a primeira pergunta de texto simples do MESMO grupo da
 * pergunta marcada como fonte do fluxo — estrutural, não depende do nome do
 * grupo (o gestor pode ter renomeado "Passos" pra qualquer coisa).
 */
export function extractGatilho(answers: AnsweredQuestion[]): string | null {
  const flowSourceAnswer = answers.find((item) => item.question.isFlowSource);
  if (!flowSourceAnswer) return null;

  const sameSectionAnswers = answers
    .filter((item) => item.question.sectionId === flowSourceAnswer.question.sectionId)
    .sort((a, b) => a.question.order - b.question.order);

  for (const item of sameSectionAnswers) {
    const parsed = AnswerSchema.safeParse(item.valueJson);
    if (parsed.success && parsed.data.kind === "text" && parsed.data.value.trim()) {
      return parsed.data.value.trim();
    }
  }
  return null;
}

export function sectionsToMarkdown(
  processName: string,
  processCode: string,
  areaName: string,
  sections: DocumentSections,
): string {
  const lines: string[] = [
    `# ${processName}`,
    "",
    `**Código:** ${processCode} · **Área:** ${areaName}`,
    "",
  ];

  sections.forEach((group, index) => {
    lines.push(`## ${index + 1}. ${group.label}`, "");
    if (group.items.length === 0) {
      lines.push("_Não preenchido._", "");
      return;
    }
    for (const item of group.items) {
      lines.push(`**${item.questionText}**`, "", item.text, "");
    }
  });

  lines.push(
    `## ${sections.length + 1}. Desenho do Processo`,
    "",
    "_Gerado automaticamente a partir dos Passos._",
    "",
  );

  return lines.join("\n");
}
