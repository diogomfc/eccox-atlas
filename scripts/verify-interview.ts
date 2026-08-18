/**
 * Verificacao da maquina de estados determinística da entrevista, sem banco e
 * sem IA. Confere que `currentPrompt` percorre a trilha na ordem certa e que
 * retomar a partir de um subconjunto de respostas volta ao ponto certo.
 *
 * `pnpm verify:interview`
 */

import {
  currentPrompt,
  type QuestionWithSection,
  sortQuestions,
} from "../src/lib/interview/engine.js";
import { DEFAULT_PROCESS_SECTIONS } from "../src/lib/process-templates/default-questions.js";

let failures = 0;

function check(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ ${message}`);
    failures += 1;
  }
}

function fakeQuestions(): QuestionWithSection[] {
  const questions: QuestionWithSection[] = [];
  DEFAULT_PROCESS_SECTIONS.forEach((section, sectionIndex) => {
    const sectionId = `s-${sectionIndex}`;
    const fakeSection = {
      id: sectionId,
      processId: "proc-1",
      label: section.label,
      order: section.order,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
    section.questions.forEach((question, questionIndex) => {
      questions.push({
        id: `q-${sectionIndex}-${questionIndex}`,
        processId: "proc-1",
        sectionId,
        order: question.order,
        questionText: question.questionText,
        helperText: question.helperText ?? null,
        inputKind: question.inputKind,
        placeholder: question.placeholder ?? null,
        required: question.required,
        allowEvidence: false,
        isFlowSource: question.inputKind === "STEPS",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        section: fakeSection,
      });
    });
  });
  return questions;
}

function walkTrail() {
  const questions = fakeQuestions();
  const sorted = sortQuestions(questions);

  console.log(`Trilha padrão: ${sorted.length} perguntas`);

  const answered = new Set<string>();
  const visitedOrder: string[] = [];

  for (let step = 0; step < sorted.length + 2; step += 1) {
    const prompt = currentPrompt(questions, answered, false);
    if (prompt.kind !== "question") break;
    visitedOrder.push(prompt.question.id);
    answered.add(prompt.question.id);
  }

  check(
    visitedOrder.join(",") === sorted.map((q) => q.id).join(","),
    `ordem das perguntas divergiu.\n    esperado: ${sorted.map((q) => q.id).join(" > ")}\n    obtido:   ${visitedOrder.join(" > ")}`,
  );

  check(
    currentPrompt(questions, answered, false).kind === "review",
    "todas respondidas deveria cair na revisão",
  );
  check(
    currentPrompt(questions, new Set(), true).kind === "review",
    "interview.status concluído deveria sempre cair na revisão, mesmo sem respostas",
  );

  // Retomada: um subconjunto de respostas sempre devolve a primeira pendente.
  const partial = new Set(visitedOrder.slice(0, 3));
  const resumed = currentPrompt(questions, partial, false);
  check(
    resumed.kind === "question" && resumed.question.id === sorted[3].id,
    "retomada com 3 respondidas deveria apontar para a 4ª pergunta",
  );

  console.log(`  ${sorted.length} perguntas percorridas na ordem, revisão e retomada conferidas`);
}

walkTrail();

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`);
  process.exit(1);
}
console.log("\nMáquina de estados da entrevista conferida.");
