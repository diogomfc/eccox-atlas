import { z } from "zod";
import type { QuestionInputKind } from "@/generated/prisma/client";

/**
 * Converte um schema Zod no formato que o OpenRouter espera em response_format.
 * O `$schema` sai fora: o modo strict de alguns provedores rejeita chaves extras
 * na raiz.
 */
export function toResponseFormat(name: string, schema: z.ZodType) {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7", io: "output" });
  delete (jsonSchema as Record<string, unknown>).$schema;

  return {
    type: "json_schema" as const,
    json_schema: { name, strict: true, schema: jsonSchema },
  };
}

/**
 * Alguns modelos, mesmo sob `response_format: json_schema` "strict", ainda
 * embrulham a saída num bloco de código markdown ("```json ... ```") em vez
 * de mandar JSON puro — visto ao vivo (SyntaxError em `JSON.parse`). Tira a
 * cerca antes de parsear, sem mudar nada quando já vem puro.
 */
export function parseJsonMaybeFenced(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

const MAX = {
  gatilho: 160,
  label: 100,
  detail: 240,
  why: 240,
  rationale: 700,
  targetOutcome: 300,
  roiReasoning: 800,
  whatDiesTitle: 100,
  whatDiesDescription: 300,
  learningLoopMetric: 100,
  learningLoopDescription: 240,
  waveTitle: 100,
  waveDescription: 300,
  waveActionDescription: 200,
} as const;

const ACTOR = z.enum(["HUMANO", "SISTEMA", "IA"]);
const STEP_TYPE = z.enum([
  "MANUAL",
  "INTEGRACAO",
  "DECISAO",
  "APROVACAO",
  "AUTOMACAO",
  "AGENTE_IA",
]);

/**
 * Saída estruturada da sugestão "IA-First" (§ suggestAiFirstAnalysis). Os
 * limites de tamanho aqui são só o teto absoluto validado no fim — o
 * `json_schema` "strict" dos provedores não garante `maxLength` de verdade
 * (só a estrutura), então o texto que passa disso é cortado antes de
 * validar, não rejeitado. Ver `clampAiFirstAnalysisRaw`. Os números de ROI
 * (horas/mês, R$/mês, R$/ano) NÃO vêm daqui — são calculados em código a
 * partir das premissas (`roi`), a IA só estima percentuais e o "porquê".
 */
export const AiFirstAnalysisResponseSchema = z.object({
  gatilho: z.string().min(1).max(MAX.gatilho),
  steps: z
    .array(
      z.object({
        type: STEP_TYPE,
        label: z.string().min(1).max(MAX.label),
        detail: z.string().max(MAX.detail).optional(),
        today: ACTOR,
        ideal: ACTOR,
        why: z.string().min(1).max(MAX.why),
      }),
    )
    .min(3)
    .max(12),
  rationale: z.string().min(1).max(MAX.rationale),
  targetOutcome: z.string().min(1).max(MAX.targetOutcome),
  roi: z.object({
    executionsPerMonth: z.number().min(0).max(100_000),
    hoursPerExecutionToday: z.number().min(0).max(1000),
    peopleInvolved: z.number().min(0).max(1000),
    costPerHourBRL: z.number().min(0).max(10_000),
    hourReductionPct: z.number().min(0).max(100),
    cycleReductionPct: z.number().min(0).max(100),
    reasoning: z.string().min(1).max(MAX.roiReasoning),
  }),
  whatDies: z
    .array(
      z.object({
        title: z.string().min(1).max(MAX.whatDiesTitle),
        description: z.string().min(1).max(MAX.whatDiesDescription),
      }),
    )
    .min(1)
    .max(8),
  learningLoop: z
    .array(
      z.object({
        metric: z.string().min(1).max(MAX.learningLoopMetric),
        description: z.string().min(1).max(MAX.learningLoopDescription),
      }),
    )
    .min(1)
    .max(6),
  wavePlan: z
    .array(
      z.object({
        wave: z.number().int().min(0).max(10),
        title: z.string().min(1).max(MAX.waveTitle),
        description: z.string().min(1).max(MAX.waveDescription),
        actions: z
          .array(
            z.object({
              type: z.enum(["AGENTE", "SISTEMA", "INTEGRACAO"]),
              description: z.string().min(1).max(MAX.waveActionDescription),
            }),
          )
          .min(1)
          .max(5),
      }),
    )
    .min(2)
    .max(6),
});

function clampStr(value: unknown, max: number): unknown {
  return typeof value === "string" ? value.slice(0, max) : value;
}

/**
 * Corta strings que passaram do teto ANTES de validar — o modelo estoura
 * `maxLength` com frequência mesmo em modo strict (o provedor não garante
 * esse keyword, só a estrutura). Cortar é melhor que descartar a resposta
 * inteira por causa de duas frases longas demais.
 */
export function clampAiFirstAnalysisRaw(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const value = raw as Record<string, unknown>;

  const steps = Array.isArray(value.steps)
    ? value.steps.map((step) => {
        if (typeof step !== "object" || step === null) return step;
        const item = step as Record<string, unknown>;
        return {
          ...item,
          label: clampStr(item.label, MAX.label),
          detail: clampStr(item.detail, MAX.detail),
          why: clampStr(item.why, MAX.why),
        };
      })
    : value.steps;

  const roi =
    typeof value.roi === "object" && value.roi !== null
      ? {
          ...(value.roi as Record<string, unknown>),
          reasoning: clampStr((value.roi as Record<string, unknown>).reasoning, MAX.roiReasoning),
        }
      : value.roi;

  const whatDies = Array.isArray(value.whatDies)
    ? value.whatDies.map((item) => {
        if (typeof item !== "object" || item === null) return item;
        const row = item as Record<string, unknown>;
        return {
          ...row,
          title: clampStr(row.title, MAX.whatDiesTitle),
          description: clampStr(row.description, MAX.whatDiesDescription),
        };
      })
    : value.whatDies;

  const learningLoop = Array.isArray(value.learningLoop)
    ? value.learningLoop.map((item) => {
        if (typeof item !== "object" || item === null) return item;
        const row = item as Record<string, unknown>;
        return {
          ...row,
          metric: clampStr(row.metric, MAX.learningLoopMetric),
          description: clampStr(row.description, MAX.learningLoopDescription),
        };
      })
    : value.learningLoop;

  const wavePlan = Array.isArray(value.wavePlan)
    ? value.wavePlan.map((item) => {
        if (typeof item !== "object" || item === null) return item;
        const row = item as Record<string, unknown>;
        const actions = Array.isArray(row.actions)
          ? row.actions.map((action) => {
              if (typeof action !== "object" || action === null) return action;
              const act = action as Record<string, unknown>;
              return { ...act, description: clampStr(act.description, MAX.waveActionDescription) };
            })
          : row.actions;
        return {
          ...row,
          title: clampStr(row.title, MAX.waveTitle),
          description: clampStr(row.description, MAX.waveDescription),
          actions,
        };
      })
    : value.wavePlan;

  return {
    ...value,
    gatilho: clampStr(value.gatilho, MAX.gatilho),
    rationale: clampStr(value.rationale, MAX.rationale),
    targetOutcome: clampStr(value.targetOutcome, MAX.targetOutcome),
    steps,
    roi,
    whatDies,
    learningLoop,
    wavePlan,
  };
}

// ---------------------------------------------------------------------------
// Consolidação multi-entrevista (§ consolidateQuestionAnswers)
// ---------------------------------------------------------------------------

const CONSOLIDATED_MAX = {
  rationale: 500,
  text: 1000,
  longText: 4000,
  listItem: 300,
  stepField: 300,
} as const;

const CONSOLIDATED_VALUE_SCHEMA_BY_KIND = {
  TEXT: z.object({ kind: z.literal("text"), value: z.string().max(CONSOLIDATED_MAX.text) }),
  LONG_TEXT: z.object({
    kind: z.literal("longText"),
    value: z.string().max(CONSOLIDATED_MAX.longText),
  }),
  NUMBER: z.object({ kind: z.literal("number"), value: z.number().nullable() }),
  LIST: z.object({
    kind: z.literal("list"),
    value: z.array(z.string().max(CONSOLIDATED_MAX.listItem)).max(50),
  }),
  STEPS: z.object({
    kind: z.literal("steps"),
    value: z
      .array(
        z.object({
          what: z.string().max(CONSOLIDATED_MAX.stepField),
          how: z.string().max(CONSOLIDATED_MAX.stepField),
          tool: z.string().max(CONSOLIDATED_MAX.stepField),
          role: z.string().max(CONSOLIDATED_MAX.stepField),
        }),
      )
      .max(20),
  }),
} as const;

/**
 * Schema de resposta pra consolidação de UMA pergunta — o `kind` já é
 * conhecido de antemão (vem de `ProcessQuestion.inputKind`), então não
 * precisa de union: o modelo só preenche `value` no formato exato daquele
 * tipo, mais o `rationale` da síntese.
 */
export function consolidatedAnswerSchemaFor(inputKind: QuestionInputKind) {
  return z.object({
    value: CONSOLIDATED_VALUE_SCHEMA_BY_KIND[inputKind],
    rationale: z.string().min(1).max(CONSOLIDATED_MAX.rationale),
  });
}

/** Corta strings antes de validar — mesmo motivo de `clampAiFirstAnalysisRaw`. */
export function clampConsolidatedAnswerRaw(raw: unknown, inputKind: QuestionInputKind): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const value = raw as Record<string, unknown>;
  const rationale = clampStr(value.rationale, CONSOLIDATED_MAX.rationale);

  const inner = value.value;
  if (typeof inner !== "object" || inner === null) return { ...value, rationale };
  const innerValue = inner as Record<string, unknown>;

  switch (inputKind) {
    case "TEXT":
      return {
        ...value,
        rationale,
        value: { ...innerValue, value: clampStr(innerValue.value, CONSOLIDATED_MAX.text) },
      };
    case "LONG_TEXT":
      return {
        ...value,
        rationale,
        value: { ...innerValue, value: clampStr(innerValue.value, CONSOLIDATED_MAX.longText) },
      };
    case "LIST":
      return {
        ...value,
        rationale,
        value: {
          ...innerValue,
          value: Array.isArray(innerValue.value)
            ? innerValue.value.map((item) => clampStr(item, CONSOLIDATED_MAX.listItem))
            : innerValue.value,
        },
      };
    case "STEPS":
      return {
        ...value,
        rationale,
        value: {
          ...innerValue,
          value: Array.isArray(innerValue.value)
            ? innerValue.value.map((step) => {
                if (typeof step !== "object" || step === null) return step;
                const row = step as Record<string, unknown>;
                return {
                  what: clampStr(row.what, CONSOLIDATED_MAX.stepField),
                  how: clampStr(row.how, CONSOLIDATED_MAX.stepField),
                  tool: clampStr(row.tool, CONSOLIDATED_MAX.stepField),
                  role: clampStr(row.role, CONSOLIDATED_MAX.stepField),
                };
              })
            : innerValue.value,
        },
      };
    default:
      return { ...value, rationale };
  }
}
