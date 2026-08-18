import "server-only";
import type { QuestionInputKind } from "@/generated/prisma/client";
import type { Answer } from "@/lib/interview/answers";

/**
 * A unica porta de saida do Atlas para modelos.
 *
 * A entrevista em si nao chama IA nenhuma — as perguntas sao cadastradas por
 * processo e o formulario avanca sozinho. Os pontos de contato com IA no
 * produto sao os metodos abaixo. Ver docs/ARQUITETURA-IA.md.
 */
export interface GovernanceModel {
  /**
   * "Melhorar com IA": reescreve/clareia um texto que a pessoa ja escreveu.
   * Sempre no OpenRouter — e uma tarefa generica de texto, nao depende de
   * doutrina, e o canal do ECI nao aceita saida controlada mesmo que quisesse.
   */
  improveText(input: ImproveTextInput): Promise<string | null>;

  /** Parecer de doutrina. `null` quando nao ha agente ECI configurado. */
  reviewAgainstDoctrine(input: DoctrineReviewInput): Promise<string | null>;

  /**
   * Sugestão "IA-First": redesenha a sequência de passos aprovada trocando
   * trabalho manual por integração/automação/agente de IA onde faz sentido,
   * junto com a análise de impacto (ROI, o que morre, matriz de papéis, loop
   * de aprendizado, plano de ondas). Ação explícita, disparada manualmente
   * pelo gestor depois do processo aprovado — nunca automática. `null`
   * quando a chamada falha.
   */
  suggestAiFirstAnalysis(input: AiFirstFlowInput): Promise<AiFirstAnalysis | null>;

  /**
   * Consolidação multi-entrevista: unifica as respostas de vários
   * entrevistados pra UMA pergunta numa resposta definitiva coesa — remove
   * redundância, resolve contradição favorecendo a resposta mais detalhada,
   * nunca inventa informação que ninguém deu. Disparado só pelo gestor
   * (botão "Consolidar com IA"), nunca automático. `null` quando a chamada
   * falha — o chamador decide o que fazer (ex: copiar a única resposta
   * direto, sem IA, quando só há um respondente).
   */
  consolidateQuestionAnswers(
    input: ConsolidateQuestionInput,
  ): Promise<ConsolidatedAnswerResult | null>;
}

export interface ImproveTextInput {
  questionText: string;
  currentText: string;
}

export interface DoctrineReviewInput {
  sectionTitle: string;
  sectionText: string;
}

export interface ConsolidateQuestionInput {
  questionText: string;
  inputKind: QuestionInputKind;
  answers: Array<{ respondentName: string; answer: Answer }>;
}

export interface ConsolidatedAnswerResult {
  value: Answer;
  rationale: string;
}

export interface AiFirstFlowInput {
  processName: string;
  objective: string;
  tools: string[];
  gatilho: string | null;
  steps: Array<{ what: string; how: string; tool: string; role: string }>;
}

/** Subconjunto de `FlowNodeType` (schema.prisma) que a IA pode escolher —
 * GATILHO e FIM são sempre adicionados automaticamente, fora da sugestão. */
export type AiFlowStepType =
  | "MANUAL"
  | "INTEGRACAO"
  | "DECISAO"
  | "APROVACAO"
  | "AUTOMACAO"
  | "AGENTE_IA";

/** Quem executa um passo — usado na Matriz de papéis. */
export type AiFlowActor = "HUMANO" | "SISTEMA" | "IA";

export interface AiFlowStep {
  type: AiFlowStepType;
  label: string;
  detail?: string;
  today: AiFlowActor;
  ideal: AiFlowActor;
  /** Por que muda (ou não) de "hoje" pra "ideal" — vira a Matriz de papéis. */
  why: string;
}

/** Premissas que a IA estima — os números finais (horas, R$/mês, R$/ano) são
 * calculados em código a partir daqui, nunca aritmética do modelo. */
export interface AiFirstRoiInput {
  executionsPerMonth: number;
  hoursPerExecutionToday: number;
  peopleInvolved: number;
  costPerHourBRL: number;
  hourReductionPct: number;
  cycleReductionPct: number;
  reasoning: string;
}

export interface AiFirstAnalysis {
  gatilho: string;
  steps: AiFlowStep[];
  /** Explicação curta do que mudou e por quê — mostrado junto do fluxo. */
  rationale: string;
  /** "Resultado-alvo" — uma frase do que o redesenho entrega. */
  targetOutcome: string;
  roi: AiFirstRoiInput;
  whatDies: Array<{ title: string; description: string }>;
  learningLoop: Array<{ metric: string; description: string }>;
  wavePlan: Array<{
    wave: number;
    title: string;
    description: string;
    actions: Array<{ type: "AGENTE" | "SISTEMA" | "INTEGRACAO"; description: string }>;
  }>;
}
