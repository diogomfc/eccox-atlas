import "server-only";
import type { QuestionInputKind } from "@/generated/prisma/client";
import { governanceModel } from "@/lib/ai";
import { db } from "@/lib/db";
import { generateDocumentFromConsolidatedAnswers } from "@/lib/documents/build";
import { type Answer, AnswerSchema } from "@/lib/interview/answers";
import { toJson } from "@/lib/json";

export interface ConsolidationSummary {
  questionsConsolidated: number;
  aiConsolidated: number;
  copiedDirect: number;
  documentId: string;
}

interface RespondentAnswer {
  respondentName: string;
  answer: Answer;
}

/**
 * Consolida UMA pergunta a partir das respostas já coletadas: 1 resposta
 * copia direto (nada pra unificar); 2+ chamam a IA. Se a IA falhar, cai pra
 * resposta mais recente entre as recebidas em vez de deixar sem nada.
 */
async function consolidateQuestion(
  processId: string,
  questionId: string,
  questionText: string,
  inputKind: QuestionInputKind,
  answers: RespondentAnswer[],
): Promise<{ aiUsed: boolean }> {
  if (answers.length === 1) {
    await db.consolidatedAnswer.upsert({
      where: { processId_questionId: { processId, questionId } },
      update: {
        valueJson: toJson(answers[0].answer),
        isAiGenerated: false,
        editedByUserId: null,
        rationale: null,
      },
      create: { processId, questionId, valueJson: toJson(answers[0].answer), isAiGenerated: false },
    });
    return { aiUsed: false };
  }

  const result = await governanceModel().consolidateQuestionAnswers({
    questionText,
    inputKind,
    answers,
  });
  const value = result?.value ?? answers[answers.length - 1].answer;
  const rationale = result?.rationale ?? null;

  await db.consolidatedAnswer.upsert({
    where: { processId_questionId: { processId, questionId } },
    update: {
      valueJson: toJson(value),
      isAiGenerated: Boolean(result),
      editedByUserId: null,
      rationale,
    },
    create: {
      processId,
      questionId,
      valueJson: toJson(value),
      isAiGenerated: Boolean(result),
      rationale,
    },
  });
  return { aiUsed: Boolean(result) };
}

async function answersByQuestionFromApprovedInterviews(
  processId: string,
): Promise<Map<string, RespondentAnswer[]>> {
  const interviews = await db.interview.findMany({
    where: { link: { processId }, status: "APROVADA" },
    include: { answers: true, link: { include: { respondent: true } } },
  });

  const byQuestion = new Map<string, RespondentAnswer[]>();
  for (const interview of interviews) {
    for (const answer of interview.answers) {
      const parsed = AnswerSchema.safeParse(answer.valueJson);
      if (!parsed.success) continue;
      const list = byQuestion.get(answer.questionId) ?? [];
      list.push({ respondentName: interview.link.respondent.name, answer: parsed.data });
      byQuestion.set(answer.questionId, list);
    }
  }
  return byQuestion;
}

/**
 * Consolida todas as perguntas do processo, uma resposta definitiva por
 * pergunta — só a partir de entrevistas **APROVADA** (aprovação individual
 * do respondente, ver src/app/actions/review.ts, continua sendo o controle
 * de qualidade que decide quem entra na consolidação). Regenera o Document
 * oficial a partir do resultado.
 */
export async function consolidateProcessInterviews(
  processId: string,
): Promise<ConsolidationSummary> {
  const answersByQuestion = await answersByQuestionFromApprovedInterviews(processId);
  const questions = await db.processQuestion.findMany({ where: { processId } });
  const questionById = new Map(questions.map((question) => [question.id, question]));

  let aiConsolidated = 0;
  let copiedDirect = 0;

  for (const [questionId, answers] of answersByQuestion) {
    const question = questionById.get(questionId);
    if (!question || answers.length === 0) continue;

    const { aiUsed } = await consolidateQuestion(
      processId,
      questionId,
      question.questionText,
      question.inputKind,
      answers,
    );
    if (answers.length === 1) copiedDirect += 1;
    else if (aiUsed) aiConsolidated += 1;
    else copiedDirect += 1;
  }

  const documentId = await generateDocumentFromConsolidatedAnswers(processId);

  return {
    questionsConsolidated: answersByQuestion.size,
    aiConsolidated,
    copiedDirect,
    documentId,
  };
}

export interface ConsolidateSingleQuestionResult {
  ok: boolean;
  error?: string;
}

/** Consolida SÓ uma pergunta (botão individual no roteiro definitivo) —
 * mesma fonte (entrevistas APROVADA), mesmo critério 1-direto/2+-IA. */
export async function consolidateSingleQuestion(
  processId: string,
  questionId: string,
): Promise<ConsolidateSingleQuestionResult> {
  const question = await db.processQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.processId !== processId) {
    return { ok: false, error: "Pergunta não encontrada neste processo." };
  }

  const answersByQuestion = await answersByQuestionFromApprovedInterviews(processId);
  const answers = answersByQuestion.get(questionId) ?? [];
  if (answers.length === 0) {
    return { ok: false, error: "Nenhuma entrevista aprovada respondeu esta pergunta ainda." };
  }

  await consolidateQuestion(
    processId,
    questionId,
    question.questionText,
    question.inputKind,
    answers,
  );
  await generateDocumentFromConsolidatedAnswers(processId);
  return { ok: true };
}
