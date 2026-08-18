import type { AiFirstAnalysis, AiFlowActor } from "@/lib/ai/gateway";

/**
 * Números finais da economia estimada — calculados aqui, nunca pela IA. O
 * modelo só estima as premissas (`AiFirstRoiInput`); a aritmética fica em
 * código pra não depender da IA acertar conta.
 */
export interface RoiComputed {
  executionsPerMonth: number;
  hoursPerExecutionToday: number;
  peopleInvolved: number;
  costPerHourBRL: number;
  hourReductionPct: number;
  cycleReductionPct: number;
  reasoning: string;
  hoursPerMonthToday: number;
  hoursPerMonthAiFirst: number;
  hoursSavedPerMonth: number;
  costPerMonthTodayBRL: number;
  costPerMonthAiFirstBRL: number;
  yearlySavingsBRL: number;
}

export interface RoleMatrixRow {
  step: string;
  today: AiFlowActor;
  ideal: AiFlowActor;
  why: string;
}

export interface AiFirstAnalysisData {
  targetOutcome: string;
  roi: RoiComputed;
  whatDies: Array<{ title: string; description: string }>;
  roleMatrix: RoleMatrixRow[];
  learningLoop: Array<{ metric: string; description: string }>;
  wavePlan: AiFirstAnalysis["wavePlan"];
}

export function computeAiFirstAnalysis(analysis: AiFirstAnalysis): AiFirstAnalysisData {
  const { roi, steps } = analysis;

  const hoursPerMonthToday =
    roi.executionsPerMonth * roi.hoursPerExecutionToday * roi.peopleInvolved;
  const hoursPerMonthAiFirst = hoursPerMonthToday * (1 - roi.hourReductionPct / 100);
  const hoursSavedPerMonth = hoursPerMonthToday - hoursPerMonthAiFirst;
  const costPerMonthTodayBRL = hoursPerMonthToday * roi.costPerHourBRL;
  const costPerMonthAiFirstBRL = hoursPerMonthAiFirst * roi.costPerHourBRL;
  const yearlySavingsBRL = (costPerMonthTodayBRL - costPerMonthAiFirstBRL) * 12;

  return {
    targetOutcome: analysis.targetOutcome,
    roi: {
      ...roi,
      hoursPerMonthToday,
      hoursPerMonthAiFirst,
      hoursSavedPerMonth,
      costPerMonthTodayBRL,
      costPerMonthAiFirstBRL,
      yearlySavingsBRL,
    },
    whatDies: analysis.whatDies,
    roleMatrix: steps.map((step) => ({
      step: step.label,
      today: step.today,
      ideal: step.ideal,
      why: step.why,
    })),
    learningLoop: analysis.learningLoop,
    wavePlan: analysis.wavePlan,
  };
}
