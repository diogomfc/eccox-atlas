/**
 * Rotulos e regras de dominio do Atlas, em pt-BR.
 * Fonte: planilha "PROCESSOS - V6 FINAL" (para Area/Wave) e o modelo oficial
 * "Modelo de Processo POP ECCOX - V3.docx" (para as secoes do Processo).
 */

import type {
  Classification,
  InterviewStatus,
  ProcessStatus,
  ReviewDecision,
  UserRole,
  Wave,
} from "@/generated/prisma/client";

export const WAVE_LABEL: Record<Wave, string> = {
  ONDA_1: "Onda 1",
  ONDA_2: "Onda 2",
  ONDA_3: "Onda 3",
  CONCLUIDO: "Concluído",
};

export const WAVE_ORDER: Wave[] = ["ONDA_1", "ONDA_2", "ONDA_3", "CONCLUIDO"];

export const PROCESS_STATUS_LABEL: Record<ProcessStatus, string> = {
  RASCUNHO: "Rascunho",
  EM_ENTREVISTA: "Em entrevista",
  EM_REVISAO: "Em revisão",
  APROVADO: "Aprovado",
};

export const INTERVIEW_STATUS_LABEL: Record<InterviewStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  EM_REVISAO: "Em revisão",
  APROVADA: "Aprovada",
};

export const REVIEW_DECISION_LABEL: Record<ReviewDecision, string> = {
  APROVADO: "Aprovado",
  SOLICITAR_REVISAO: "Revisão solicitada",
};

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  INTERNA_GERAL: "Interna Geral",
  INTERNA_EXCLUSIVA_AREA: "Interna Exclusivo da Área",
  PUBLICA: "Pública",
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  GESTOR: "Gestor",
  COLABORADOR: "Colaborador",
};

/** Um processo conta como coberto quando o documento já foi aprovado. */
export function isCovered(status: ProcessStatus): boolean {
  return status === "APROVADO";
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}
