import type { ProcessQuestion, ProcessSection } from "@/generated/prisma/client";

/**
 * Motor determinístico: a trilha é a lista de `ProcessQuestion` cadastrada no
 * processo, ordenada por seção (`ProcessSection.order`) e depois por
 * `order` dentro da seção. Nenhuma IA decide o próximo passo — responder
 * avança para a próxima pergunta cadastrada, ponto.
 *
 * Seções são dinâmicas por processo (o gestor cria/renomeia grupos) — não há
 * mais uma lista fixa de 4 seções. Toda função aqui recebe a pergunta já com
 * `section` incluído (ver `QuestionWithSection`).
 */

export type QuestionWithSection = ProcessQuestion & { section: ProcessSection };

/** Ordena a trilha completa: pela ordem da seção, depois pela ordem da pergunta dentro dela. */
export function sortQuestions<T extends QuestionWithSection>(questions: T[]): T[] {
  return [...questions].sort((a, b) => {
    const sectionDiff = a.section.order - b.section.order;
    return sectionDiff !== 0 ? sectionDiff : a.order - b.order;
  });
}

export type InterviewPrompt =
  | {
      kind: "question";
      question: QuestionWithSection;
      index: number;
      total: number;
      sectionIndex: number;
    }
  | { kind: "review" };

/**
 * A próxima pergunta sem resposta na trilha ordenada. `answeredQuestionIds`
 * são os `questionId` já presentes em `InterviewAnswer` — carregar isso do
 * banco é o que permite retomar de onde parou.
 */
export function currentPrompt(
  questions: QuestionWithSection[],
  answeredQuestionIds: Set<string>,
  completed: boolean,
): InterviewPrompt {
  if (completed) return { kind: "review" };

  const trail = sortQuestions(questions);
  const index = trail.findIndex((question) => !answeredQuestionIds.has(question.id));
  if (index < 0) return { kind: "review" };

  const sectionIds = [...new Set(trail.map((question) => question.sectionId))];

  return {
    kind: "question",
    question: trail[index],
    index,
    total: trail.length,
    sectionIndex: sectionIds.indexOf(trail[index].sectionId),
  };
}
