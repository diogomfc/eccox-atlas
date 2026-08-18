import "server-only";
import { EciGateway } from "@/lib/ai/eci-gateway";
import type { GovernanceModel } from "@/lib/ai/gateway";
import { OpenRouterGateway } from "@/lib/ai/openrouter-gateway";

let instance: GovernanceModel | null = null;

/**
 * Resolve o gateway uma vez por processo. Com as três variáveis do ECI
 * preenchidas, o parecer de doutrina passa a vir do agente publicado lá;
 * sem elas, o Atlas roda inteiro no OpenRouter e o parecer não aparece.
 */
export function governanceModel(): GovernanceModel {
  if (instance) return instance;

  const baseUrl = process.env.ECI_BASE_URL;
  const agentCode = process.env.ECI_AGENT_CODE;
  const apiKey = process.env.ECI_API_KEY;

  instance =
    baseUrl && agentCode && apiKey
      ? new EciGateway(baseUrl.replace(/\/$/, ""), agentCode, apiKey)
      : new OpenRouterGateway();

  return instance;
}

export type { GovernanceModel } from "@/lib/ai/gateway";
