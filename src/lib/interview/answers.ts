import { z } from "zod";
import type { QuestionInputKind } from "@/generated/prisma/client";
import { type QuestionWithSection, sortQuestions } from "@/lib/interview/engine";

/**
 * Formatos de resposta aceites por tipo de input, e a conversao para o texto
 * que fica no documento gerado. Cobre exatamente os tipos de
 * `QuestionInputKind` do schema — ver src/lib/interview/engine.ts.
 */

export const StepSchema = z.object({
  what: z.string().min(1),
  how: z.string(),
  tool: z.string(),
  role: z.string(),
});

export const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), value: z.string() }),
  z.object({ kind: z.literal("longText"), value: z.string() }),
  z.object({ kind: z.literal("number"), value: z.number().nullable() }),
  z.object({ kind: z.literal("list"), value: z.array(z.string()) }),
  z.object({ kind: z.literal("steps"), value: z.array(StepSchema) }),
]);

export type Answer = z.infer<typeof AnswerSchema>;
export type Step = z.infer<typeof StepSchema>;

const KIND_BY_INPUT: Record<QuestionInputKind, Answer["kind"]> = {
  TEXT: "text",
  LONG_TEXT: "longText",
  NUMBER: "number",
  LIST: "list",
  STEPS: "steps",
};

export function answerKindFor(inputKind: QuestionInputKind): Answer["kind"] {
  return KIND_BY_INPUT[inputKind];
}

/** Resposta vazia inicial para um tipo de pergunta. */
export function emptyAnswer(inputKind: QuestionInputKind): Answer {
  switch (inputKind) {
    case "NUMBER":
      return { kind: "number", value: null };
    case "LIST":
      return { kind: "list", value: [] };
    case "STEPS":
      return { kind: "steps", value: [{ what: "", how: "", tool: "", role: "" }] };
    case "LONG_TEXT":
      return { kind: "longText", value: "" };
    default:
      return { kind: "text", value: "" };
  }
}

export function isAnswerEmpty(answer: Answer): boolean {
  switch (answer.kind) {
    case "text":
    case "longText":
      return answer.value.trim().length === 0;
    case "number":
      return answer.value === null;
    case "list":
      return answer.value.every((item) => item.trim().length === 0);
    case "steps":
      return answer.value.every((item) => item.what.trim().length === 0);
  }
}

/** Converte a resposta marcada como fonte do fluxo (`ProcessQuestion.isFlowSource`)
 * em Passos pro desenho automático (seção 5). `steps` já traz ferramenta/cargo
 * por item; `list` vira um passo por item, só com rótulo. Outros tipos não
 * representam sequência, então não geram passo nenhum. */
export function answerToFlowSteps(answer: Answer): Step[] {
  switch (answer.kind) {
    case "steps":
      return answer.value.filter((step) => step.what.trim());
    case "list":
      return answer.value
        .map((item) => item.trim())
        .filter(Boolean)
        .map((text) => ({ what: text, how: "", tool: "", role: "" }));
    default:
      return [];
  }
}

export interface SectionProgress {
  sectionId: string;
  label: string;
  answered: number;
  total: number;
}

/** Progresso por seção — usado no resumo lateral, sem nenhuma IA envolvida.
 * Seções são dinâmicas: agrupa pelas seções que as perguntas já carregam.
 * `visitedQuestionIds` é o conjunto de perguntas com resposta salva de
 * verdade (linha em `InterviewAnswer`) — sem isso, uma pergunta opcional
 * nunca visitada contaria como concluída só por não ser obrigatória. */
export function sectionProgress(
  questions: QuestionWithSection[],
  answersByQuestionId: Record<string, Answer>,
  visitedQuestionIds: ReadonlySet<string>,
): SectionProgress[] {
  const sorted = sortQuestions(questions);
  const groups = new Map<
    string,
    { label: string; order: number; questions: QuestionWithSection[] }
  >();

  for (const question of sorted) {
    const existing = groups.get(question.sectionId);
    if (existing) existing.questions.push(question);
    else
      groups.set(question.sectionId, {
        label: question.section.label,
        order: question.section.order,
        questions: [question],
      });
  }

  return [...groups.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([sectionId, group]) => {
      // Opcional só conta como concluída depois de visitada (com resposta salva,
      // mesmo em branco) — nunca antes disso, pra não confundir quem ainda não
      // passou por ela. Obrigatória sempre exige valor preenchido de verdade.
      const answered = group.questions.filter((question) => {
        const answer = answersByQuestionId[question.id];
        const filled = Boolean(answer) && !isAnswerEmpty(answer);
        const visited = visitedQuestionIds.has(question.id);
        return filled || (visited && !question.required);
      }).length;
      return { sectionId, label: group.label, answered, total: group.questions.length };
    });
}

/** Converte a resposta no texto que entra no documento gerado. */
export function answerToText(answer: Answer): string {
  switch (answer.kind) {
    case "text":
    case "longText":
      return answer.value.trim();

    case "number":
      return answer.value === null ? "" : String(answer.value);

    case "list":
      return answer.value
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => `- ${item}`)
        .join("\n");

    case "steps":
      return answer.value
        .filter((item) => item.what.trim())
        .map(
          (item, index) =>
            `${index + 1}. ${item.what.trim()}` +
            (item.how.trim() ? ` — como: ${item.how.trim()}` : "") +
            (item.tool.trim() ? ` — ferramenta: ${item.tool.trim()}` : "") +
            (item.role.trim() ? ` — executa: ${item.role.trim()}` : ""),
        )
        .join("\n");
  }
}
