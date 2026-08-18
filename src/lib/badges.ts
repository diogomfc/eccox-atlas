/**
 * Cor e rotulo de badge por status/prioridade, num unico lugar - antes vivia
 * duplicado em cada pagina (processos/page.tsx, atlas/process-list.tsx,
 * minhas-entrevistas/page.tsx), e a pagina de detalhe do processo nem usava
 * o mapa. Classes usam token semantico, nunca hex direto.
 */

import type { InterviewStatus, ProcessPriority, ProcessStatus } from "@/generated/prisma/client";
import { INTERVIEW_STATUS_LABEL, PROCESS_STATUS_LABEL } from "@/lib/domain";

export interface BadgeStyle {
  label: string;
  className: string;
}

const NEUTRAL = "bg-muted text-muted-foreground";
const PURPLE = "bg-[oklch(0.55_0.15_290/0.15)] text-[oklch(0.55_0.15_290)]";
const AMBER = "bg-warning/15 text-warning";
const SUCCESS = "bg-success/15 text-success";

export const PROCESS_STATUS_STYLE: Record<ProcessStatus, BadgeStyle> = {
  RASCUNHO: { label: PROCESS_STATUS_LABEL.RASCUNHO, className: NEUTRAL },
  EM_ENTREVISTA: { label: PROCESS_STATUS_LABEL.EM_ENTREVISTA, className: AMBER },
  EM_REVISAO: { label: PROCESS_STATUS_LABEL.EM_REVISAO, className: PURPLE },
  APROVADO: { label: PROCESS_STATUS_LABEL.APROVADO, className: SUCCESS },
};

export const INTERVIEW_STATUS_STYLE: Record<InterviewStatus, BadgeStyle> = {
  RASCUNHO: { label: INTERVIEW_STATUS_LABEL.RASCUNHO, className: NEUTRAL },
  ENVIADA: { label: INTERVIEW_STATUS_LABEL.ENVIADA, className: AMBER },
  EM_REVISAO: { label: INTERVIEW_STATUS_LABEL.EM_REVISAO, className: PURPLE },
  APROVADA: { label: INTERVIEW_STATUS_LABEL.APROVADA, className: SUCCESS },
};

export const PROCESS_PRIORITY_LABEL: Record<ProcessPriority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

export const PROCESS_PRIORITY_ORDER: ProcessPriority[] = ["CRITICA", "ALTA", "MEDIA", "BAIXA"];

export const PROCESS_PRIORITY_STYLE: Record<ProcessPriority, BadgeStyle> = {
  BAIXA: { label: PROCESS_PRIORITY_LABEL.BAIXA, className: "bg-info/15 text-info" },
  MEDIA: { label: PROCESS_PRIORITY_LABEL.MEDIA, className: AMBER },
  ALTA: {
    label: PROCESS_PRIORITY_LABEL.ALTA,
    className: "bg-[oklch(0.65_0.19_45/0.15)] text-[oklch(0.55_0.19_45)]",
  },
  CRITICA: {
    label: PROCESS_PRIORITY_LABEL.CRITICA,
    className: "bg-destructive/15 text-destructive",
  },
};
