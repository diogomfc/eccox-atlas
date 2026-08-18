import "server-only";
import OpenAI from "openai";
import type {
  AiFirstAnalysis,
  AiFirstFlowInput,
  ConsolidatedAnswerResult,
  ConsolidateQuestionInput,
  DoctrineReviewInput,
  GovernanceModel,
  ImproveTextInput,
} from "@/lib/ai/gateway";
import {
  AiFirstAnalysisResponseSchema,
  clampAiFirstAnalysisRaw,
  clampConsolidatedAnswerRaw,
  consolidatedAnswerSchemaFor,
  parseJsonMaybeFenced,
  toResponseFormat,
} from "@/lib/ai/schemas";
import { answerToText } from "@/lib/interview/answers";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY não definida.");
    }
    client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      defaultHeaders: { "X-Title": "ECCOX Atlas" },
    });
  }
  return client;
}

function model(): string {
  return process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";
}

const IMPROVE_SYSTEM_PROMPT = `
Você melhora uma resposta que um Eccoxer escreveu num formulário de mapeamento de
processos internos, em português do Brasil. Corrija gramática, deixe mais claro e
direto, mas preserve o sentido e o vocabulário técnico. Não adicione informação que
não estava lá. Não faça perguntas de volta. Responda APENAS com o texto melhorado,
sem aspas, sem comentário, sem explicação.
`.trim();

export class OpenRouterGateway implements GovernanceModel {
  async improveText(input: ImproveTextInput): Promise<string | null> {
    try {
      const completion = await getClient().chat.completions.create({
        model: model(),
        temperature: 0.3,
        messages: [
          { role: "system", content: IMPROVE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Pergunta: ${input.questionText}\n\nResposta a melhorar:\n${input.currentText}`,
          },
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim();
      return text || null;
    } catch (error) {
      console.error("[ai] improveText falhou:", error);
      return null;
    }
  }

  /**
   * Sem agente ECI configurado, o Atlas não emite parecer de doutrina próprio —
   * seria o mesmo modelo se auto-avaliando, o que não acrescenta nada.
   */
  async reviewAgainstDoctrine(_input: DoctrineReviewInput): Promise<string | null> {
    return null;
  }

  async suggestAiFirstAnalysis(input: AiFirstFlowInput): Promise<AiFirstAnalysis | null> {
    try {
      const completion = await getClient().chat.completions.create({
        model: model(),
        temperature: 0.4,
        response_format: toResponseFormat("ai_first_analysis", AiFirstAnalysisResponseSchema),
        messages: [
          { role: "system", content: AI_FIRST_SYSTEM_PROMPT },
          { role: "user", content: buildAiFirstUserPrompt(input) },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) return null;

      const parsed = AiFirstAnalysisResponseSchema.safeParse(
        clampAiFirstAnalysisRaw(parseJsonMaybeFenced(raw)),
      );
      if (!parsed.success) {
        console.error("[ai] suggestAiFirstAnalysis: saída fora do schema", parsed.error);
        return null;
      }
      return parsed.data;
    } catch (error) {
      console.error("[ai] suggestAiFirstAnalysis falhou:", error);
      return null;
    }
  }

  async consolidateQuestionAnswers(
    input: ConsolidateQuestionInput,
  ): Promise<ConsolidatedAnswerResult | null> {
    try {
      const schema = consolidatedAnswerSchemaFor(input.inputKind);
      const completion = await getClient().chat.completions.create({
        model: model(),
        temperature: 0.3,
        response_format: toResponseFormat("consolidated_answer", schema),
        messages: [
          { role: "system", content: CONSOLIDATE_SYSTEM_PROMPT },
          { role: "user", content: buildConsolidateUserPrompt(input) },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) return null;

      const parsed = schema.safeParse(
        clampConsolidatedAnswerRaw(parseJsonMaybeFenced(raw), input.inputKind),
      );
      if (!parsed.success) {
        console.error("[ai] consolidateQuestionAnswers: saída fora do schema", parsed.error);
        return null;
      }
      return parsed.data as ConsolidatedAnswerResult;
    } catch (error) {
      console.error("[ai] consolidateQuestionAnswers falhou:", error);
      return null;
    }
  }
}

const CONSOLIDATE_SYSTEM_PROMPT = `
Você consolida as respostas de vários Eccoxers pra UMA pergunta de mapeamento
de processo interno, em português do Brasil, numa única resposta definitiva.

Regras:
- Unifique as informações — não escolha só uma resposta e ignore as outras,
  combine o que cada uma acrescenta.
- Remova redundância: se duas pessoas disseram a mesma coisa com palavras
  diferentes, isso vira uma só entrada, não duas.
- Se houver contradição real entre respondentes, favoreça a resposta mais
  detalhada e específica; se não der pra decidir, mencione as duas visões no
  "rationale" e escolha a mais provável pra "value".
- NUNCA invente informação que nenhum respondente deu.
- Preserve o formato pedido (mesmo "kind" da pergunta original) — não mude a
  estrutura de listas ou passos, só o conteúdo.
- "rationale": até 3 frases curtas explicando como você combinou as
  respostas (o que veio de onde, o que foi descartado por redundância).

Responda APENAS o JSON pedido.
`.trim();

function buildConsolidateUserPrompt(input: ConsolidateQuestionInput): string {
  const answers = input.answers
    .map((item) => `${item.respondentName}: ${answerToText(item.answer) || "(em branco)"}`)
    .join("\n\n");

  return [`Pergunta: ${input.questionText}`, "", "Respostas recebidas:", answers].join("\n");
}

const AI_FIRST_SYSTEM_PROMPT = `
Você redesenha o fluxo operacional de um processo interno da ECCOX (empresa
brasileira de software para mainframe e sistemas abertos) para uma versão
"IA-First": o mesmo resultado, com menos trabalho manual repetitivo — e monta
a análise de impacto completa que acompanha essa proposta.

Regras do fluxo redesenhado:
- NUNCA sugira trocar as ferramentas já usadas — a diretriz da ECCOX é manter
  as ferramentas atuais. Você pode propor automatizar, orquestrar ou usar um
  agente de IA SOBRE as ferramentas que já existem, nunca substituí-las.
- Reclassifique cada passo num destes tipos: MANUAL (continua manual, sem
  mudança), INTEGRACAO (automação simples entre sistemas, sem julgamento),
  AUTOMACAO (regra determinística que hoje uma pessoa executa à mão),
  AGENTE_IA (uma tarefa que exige leitura/julgamento e um agente de IA pode
  assumir, com revisão humana quando fizer sentido), APROVACAO (um gate de
  aprovação humana), DECISAO (um ponto de bifurcação lógica no fluxo).
- Só use AGENTE_IA quando fizer sentido de verdade — não force IA em todo
  passo. Passos que exigem julgamento humano final ou responsabilidade legal
  continuam MANUAL ou APROVACAO.
- Para cada passo, diga quem executa HOJE e quem executaria no cenário IDEAL
  (HUMANO, SISTEMA ou IA) e por quê ("why") — isso vira a Matriz de papéis.
  Um passo pode continuar HUMANO nos dois (ex: decisão final de aprovação) —
  não force mudança onde não faz sentido.
- Mantenha entre 3 e 12 passos, na mesma ordem lógica do fluxo original salvo
  quando remover uma etapa redundante.
- "label": até 12 palavras. "detail": até 25 palavras, direto ao ponto.

Regras da análise de impacto:
- "targetOutcome": uma frase objetiva do resultado prático do redesenho
  (ex: "Fechar o mês com o DRE validado até o 5º dia útil").
- "roi": estime só as PREMISSAS (execuções/mês, horas/execução hoje, pessoas
  envolvidas, custo/hora em R$, % de redução de horas, % de redução de ciclo)
  e explique o raciocínio em "reasoning" — NÃO calcule horas/mês nem R$, isso
  é feito em código a partir das suas premissas. Premissas conservadoras,
  plausíveis pro contexto descrito.
- "whatDies": 2 a 5 hábitos/etapas burocráticas que deixam de existir ou de
  precisar de atenção humana no redesenho — título curto + descrição concreta.
- "learningLoop": 3 a 5 métricas que o processo deveria medir continuamente
  pra saber se o redesenho está funcionando (nome da métrica + o que ela
  mede).
- "wavePlan": 2 a 4 ondas de implementação (0, 1, 2...), da mais barata/rápida
  pra mais ambiciosa, cada uma com 1 a 3 ações tipadas (AGENTE, SISTEMA ou
  INTEGRACAO) descrevendo o que constrói naquela onda.

Responda em português do Brasil. Responda APENAS o JSON pedido.
`.trim();

function buildAiFirstUserPrompt(input: AiFirstFlowInput): string {
  const steps = input.steps
    .map(
      (step, index) =>
        `${index + 1}. ${step.what}` +
        (step.how ? ` — como: ${step.how}` : "") +
        (step.tool ? ` — ferramenta: ${step.tool}` : "") +
        (step.role ? ` — executa: ${step.role}` : ""),
    )
    .join("\n");

  return [
    `Processo: ${input.processName}`,
    input.objective ? `Objetivo: ${input.objective}` : null,
    input.tools.length > 0 ? `Ferramentas em uso: ${input.tools.join(", ")}` : null,
    input.gatilho ? `Gatilho atual: ${input.gatilho}` : null,
    "",
    "Passos atuais (fluxo Hoje):",
    steps,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
