import "server-only";
import type {
  AiFirstFlowInput,
  ConsolidateQuestionInput,
  DoctrineReviewInput,
  GovernanceModel,
  ImproveTextInput,
} from "@/lib/ai/gateway";
import { OpenRouterGateway } from "@/lib/ai/openrouter-gateway";

/**
 * Consome o agente de governança publicado no ECI.
 *
 * Só o parecer de doutrina passa por aqui. O canal API do ECI aceita apenas
 * `{ message }` e devolve texto livre — não há como forçar um schema —, então
 * "melhorar com IA" continua sempre no OpenRouter. Ver docs/ARQUITETURA-IA.md.
 */
export class EciGateway implements GovernanceModel {
  private readonly fallback = new OpenRouterGateway();

  constructor(
    private readonly baseUrl: string,
    private readonly agentCode: string,
    private readonly apiKey: string,
  ) {}

  improveText(input: ImproveTextInput) {
    return this.fallback.improveText(input);
  }

  suggestAiFirstAnalysis(input: AiFirstFlowInput) {
    return this.fallback.suggestAiFirstAnalysis(input);
  }

  consolidateQuestionAnswers(input: ConsolidateQuestionInput) {
    return this.fallback.consolidateQuestionAnswers(input);
  }

  async reviewAgainstDoctrine(input: DoctrineReviewInput): Promise<string | null> {
    const message = [
      `Avalie a seção "${input.sectionTitle}" de um Processo (POP, modelo V3) contra o padrão de governança da ECCOX.`,
      "Aponte apenas desvios concretos do padrão, em no máximo três frases. Se estiver conforme, responda apenas: Conforme.",
      "",
      "Texto da seção:",
      input.sectionText,
    ].join("\n");

    try {
      const response = await fetch(`${this.baseUrl}/v1/agents/${this.agentCode}/invoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        // 403 é o caso comum e esperado: republicar um agente no ECI reseta os
        // canais para só-chat, desligando o canal API sem avisar ninguém.
        console.warn(
          `[eci] parecer de doutrina indisponível (HTTP ${response.status}) para o agente ${this.agentCode}`,
        );
        return null;
      }

      const body = (await response.json()) as { reply?: unknown };
      const reply = typeof body.reply === "string" ? body.reply.trim() : "";
      if (!reply || /^conforme\.?$/i.test(reply)) return null;
      return reply;
    } catch (error) {
      console.warn("[eci] parecer de doutrina falhou:", error);
      return null;
    }
  }
}
