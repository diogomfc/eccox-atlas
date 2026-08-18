"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { governanceModel } from "@/lib/ai";
import { db } from "@/lib/db";
import { computeAiFirstAnalysis } from "@/lib/documents/ai-first-analysis";
import { buildFlowFromAiSteps } from "@/lib/documents/flow";
import { extractGatilho, extractSteps } from "@/lib/documents/sections";
import { AnswerSchema, answerToText } from "@/lib/interview/answers";
import { toJson } from "@/lib/json";

export interface GenerateAiFirstFlowResult {
  ok: boolean;
  error?: string;
}

/**
 * Sugestão "IA-First": ação explícita do gestor, só depois do processo
 * aprovado. Lê a entrevista aprovada (não o FlowGraph — ali os Passos já
 * perderam o "como"/"quem executa"), pede pro modelo redesenhar (fluxo +
 * análise de impacto) e grava como FlowGraph kind=TO_BE na versão de
 * documento atual. Nunca dispara sozinho.
 */
export async function generateAiFirstFlow(processId: string): Promise<GenerateAiFirstFlowResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") {
    return { ok: false, error: "Só um gestor pode gerar a sugestão de IA." };
  }

  const process = await db.process.findUnique({ where: { id: processId } });
  if (!process) return { ok: false, error: "Processo não encontrado." };
  if (process.status !== "APROVADO") {
    return { ok: false, error: "Só processos aprovados podem receber sugestão de IA." };
  }

  const document = await db.document.findFirst({
    where: { processId, isDraft: false },
    orderBy: { version: "desc" },
  });
  if (!document) return { ok: false, error: "Nenhum documento aprovado encontrado." };

  // Fonte de verdade é a resposta CONSOLIDADA (uma por pergunta, já
  // unificada entre respondentes) — não mais a entrevista de uma pessoa só.
  const consolidated = await db.consolidatedAnswer.findMany({
    where: { processId },
    include: { question: { include: { section: true } } },
  });
  if (consolidated.length === 0) {
    return { ok: false, error: "Consolide as entrevistas antes de gerar a sugestão de IA." };
  }
  const answers = consolidated;
  const steps = extractSteps(answers);
  if (steps.length === 0) {
    return { ok: false, error: "O processo não tem Passos suficientes para redesenhar." };
  }
  const gatilho = extractGatilho(answers);

  // Grupos são livres (o gestor pode renomear), então o achado é por rótulo —
  // cai pro campo `objective` do próprio Process se não achar um grupo óbvio.
  const objectiveAnswer = answers.find((item) => /objet/i.test(item.question.section.label));
  const objective = objectiveAnswer
    ? (() => {
        const parsed = AnswerSchema.safeParse(objectiveAnswer.valueJson);
        return parsed.success ? answerToText(parsed.data) : "";
      })()
    : (process.objective ?? "");

  const toolsAnswer = answers.find((item) => /ferramenta/i.test(item.question.section.label));
  const tools = toolsAnswer
    ? (() => {
        const parsed = AnswerSchema.safeParse(toolsAnswer.valueJson);
        return parsed.success && parsed.data.kind === "list"
          ? parsed.data.value.filter(Boolean)
          : [];
      })()
    : [];

  const analysis = await governanceModel().suggestAiFirstAnalysis({
    processName: process.name,
    objective,
    tools,
    gatilho,
    steps,
  });
  if (!analysis) {
    return {
      ok: false,
      error: "Não foi possível gerar a sugestão agora. Tente de novo em instantes.",
    };
  }

  const flow = buildFlowFromAiSteps(analysis.gatilho, analysis.steps);
  if (!flow) return { ok: false, error: "A sugestão veio sem passos aproveitáveis." };

  const analysisData = computeAiFirstAnalysis(analysis);

  await db.flowGraph.upsert({
    where: { documentId_kind: { documentId: document.id, kind: "TO_BE" } },
    update: {
      nodesJson: toJson(flow.nodes),
      edgesJson: toJson(flow.edges),
      rationale: analysis.rationale,
      analysisJson: toJson(analysisData),
    },
    create: {
      documentId: document.id,
      kind: "TO_BE",
      nodesJson: toJson(flow.nodes),
      edgesJson: toJson(flow.edges),
      rationale: analysis.rationale,
      analysisJson: toJson(analysisData),
    },
  });

  revalidatePath(`/processos/${processId}`);
  return { ok: true };
}
