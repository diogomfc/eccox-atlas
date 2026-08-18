"use server";

import { governanceModel } from "@/lib/ai";

/**
 * "Melhorar com IA" — o único ponto onde a IA participa da entrevista, e só
 * quando a pessoa pede. Nunca dispara sozinho, nunca decide o fluxo.
 */
export async function improveAnswerText(
  questionText: string,
  currentText: string,
): Promise<string | null> {
  if (!currentText.trim()) return null;
  return governanceModel().improveText({ questionText, currentText });
}
