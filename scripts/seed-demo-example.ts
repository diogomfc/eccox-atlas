/**
 * Monta um exemplo completo e realista de ponta a ponta, pedido explicitamente
 * pelo usuario pra servir de referencia visual: convite, entrevista respondida,
 * um ciclo de revisao solicitada, reenvio e aprovacao final — com documento e
 * fluxo gerados de verdade (mesmas funcoes usadas em producao, sem atalho).
 *
 * Usa o processo "Recrutamento & Selecao" (area People & Performance) do
 * catalogo V6 ja seedado. Convidada: Marcela Prado (marcella.prado@eccox.com).
 *
 * `pnpm tsx scripts/seed-demo-example.ts`
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { nanoid } from "nanoid";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { buildFlowFromSteps } from "../src/lib/documents/flow.js";
import {
  buildSections,
  extractGatilho,
  extractSteps,
  sectionsToMarkdown,
} from "../src/lib/documents/sections.js";
import type { Answer } from "../src/lib/interview/answers.js";
import { toJson } from "../src/lib/json.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL nao definida.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * Mesma lógica de src/lib/documents/build.ts (montagem direta, sem IA) —
 * reimplementada aqui porque aquele módulo importa "server-only", que só
 * resolve dentro do runtime do Next, não num script standalone.
 */
async function createDocumentVersion(interviewId: string): Promise<string> {
  const interview = await db.interview.findUniqueOrThrow({
    where: { id: interviewId },
    include: {
      answers: { include: { question: { include: { section: true } } } },
      link: { include: { process: { include: { area: true } }, respondent: true } },
    },
  });

  const { process: proc, respondent } = interview.link;
  const sections = buildSections(interview.answers);
  const contentMarkdown = sectionsToMarkdown(proc.name, proc.code, proc.area.name, sections);

  const lastVersion = await db.document.findFirst({
    where: { processId: proc.id },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (lastVersion?.version ?? 0) + 1;

  const document = await db.document.create({
    data: {
      processId: proc.id,
      version,
      sectionsJson: toJson(sections),
      contentMarkdown,
      isDraft: true,
      elaboradoPor: respondent.name,
      dataElaboracao: new Date(),
    },
  });

  const gatilho = extractGatilho(interview.answers);
  const steps = extractSteps(interview.answers);
  const flow = buildFlowFromSteps(gatilho, steps);
  if (flow) {
    await db.flowGraph.create({
      data: {
        documentId: document.id,
        kind: "AS_IS",
        nodesJson: toJson(flow.nodes),
        edgesJson: toJson(flow.edges),
      },
    });
  }

  return document.id;
}

async function main() {
  const gestor = await db.user.findFirst({
    where: { role: "GESTOR" },
    orderBy: { createdAt: "asc" },
  });
  if (!gestor) {
    throw new Error(
      "Nenhum GESTOR encontrado — faca login pelo menos uma vez no Atlas antes de rodar este script.",
    );
  }

  const targetProcess = await db.process.findFirst({
    where: { name: { contains: "Recrutamento", mode: "insensitive" } },
    include: { questions: { include: { section: true } }, area: true },
  });
  if (!targetProcess) {
    throw new Error('Processo "Recrutamento & Seleção" não encontrado no catálogo.');
  }

  console.log(
    `Processo: ${targetProcess.code} — ${targetProcess.name} (${targetProcess.area.name})`,
  );

  const respondentEmail = "marcella.prado@eccox.com";
  const respondent = await db.user.upsert({
    where: { email: respondentEmail },
    update: {},
    create: {
      entraOid: `pending:${respondentEmail}`,
      email: respondentEmail,
      name: "Marcela Prado",
      role: "COLABORADOR",
      department: targetProcess.area.name,
    },
  });
  console.log(`Convidada: ${respondent.name} <${respondent.email}>`);

  // Limpa uma execucao anterior deste script pra ficar idempotente.
  await db.interviewLink.deleteMany({
    where: { processId: targetProcess.id, respondentUserId: respondent.id },
  });
  await db.document.deleteMany({ where: { processId: targetProcess.id } });

  const link = await db.interviewLink.create({
    data: {
      processId: targetProcess.id,
      token: nanoid(32),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      invitedById: gestor.id,
      respondentUserId: respondent.id,
      status: "CONCLUIDO",
    },
  });

  const answersByQuestion = buildAnswers();

  const interview = await db.interview.create({
    data: { linkId: link.id, status: "RASCUNHO" },
  });

  for (const question of targetProcess.questions) {
    const answer = answersByQuestion[question.section.label]?.[question.order];
    if (!answer) continue;
    await db.interviewAnswer.create({
      data: { interviewId: interview.id, questionId: question.id, valueJson: toJson(answer) },
    });
  }

  // Ciclo 1: envia, gestor pede ajuste (historico de revisao de verdade).
  await db.interview.update({
    where: { id: interview.id },
    data: { status: "ENVIADA", submittedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
  });
  await db.process.update({ where: { id: targetProcess.id }, data: { status: "EM_REVISAO" } });
  await createDocumentVersion(interview.id);

  await db.review.create({
    data: {
      interviewId: interview.id,
      reviewerId: gestor.id,
      decision: "SOLICITAR_REVISAO",
      comment:
        "Ficha boa! Só detalha melhor o passo de triagem de currículos — qual critério de corte vocês usam hoje — e confirma se o ATS entra na lista de ferramentas.",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
  await db.interview.update({ where: { id: interview.id }, data: { status: "EM_REVISAO" } });
  await db.process.update({ where: { id: targetProcess.id }, data: { status: "EM_ENTREVISTA" } });

  // Colaborador ajusta a resposta de ferramentas (adiciona o ATS) e reenvia.
  const toolsQuestion = targetProcess.questions.find((q) => q.section.label === "Ferramentas");
  if (toolsQuestion) {
    const updated: Answer = {
      kind: "list",
      value: ["Gupy (ATS)", "LinkedIn Recruiter", "Google Meet", "Monday"],
    };
    await db.interviewAnswer.update({
      where: {
        interviewId_questionId: { interviewId: interview.id, questionId: toolsQuestion.id },
      },
      data: { valueJson: toJson(updated) },
    });
  }

  await db.interview.update({
    where: { id: interview.id },
    data: { status: "ENVIADA", submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  });
  await db.process.update({ where: { id: targetProcess.id }, data: { status: "EM_REVISAO" } });
  await createDocumentVersion(interview.id);

  // Ciclo 2: aprovado.
  await db.review.create({
    data: {
      interviewId: interview.id,
      reviewerId: gestor.id,
      decision: "APROVADO",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  await db.interview.update({ where: { id: interview.id }, data: { status: "APROVADA" } });
  await db.process.update({ where: { id: targetProcess.id }, data: { status: "APROVADO" } });

  const latestDocument = await db.document.findFirst({
    where: { processId: targetProcess.id },
    orderBy: { version: "desc" },
  });
  if (latestDocument) {
    await db.document.update({
      where: { id: latestDocument.id },
      data: {
        isDraft: false,
        aprovadoPor: gestor.name,
        dataAprovacao: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("\nPronto. Abra:");
  console.log(
    `  /processos/${targetProcess.id}  — documento aprovado v${latestDocument?.version}, fluxo, aba Documento`,
  );
  console.log(`  /entrevistas/${interview.id}  — histórico de revisão (solicitada + aprovada)`);
}

type AnswersBySectionOrder = Record<string, Record<number, Answer>>;

function buildAnswers(): AnswersBySectionOrder {
  const steps = [
    {
      what: "Abrir a vaga no Gupy a partir da requisição aprovada",
      how: "Gestor solicitante preenche o formulário de abertura de vaga com perfil, senioridade e faixa salarial",
      tool: "Gupy",
      role: "Analista de R&S",
    },
    {
      what: "Divulgar a vaga e fazer sourcing ativo",
      how: "Publicação no Gupy + LinkedIn Recruiter, busca ativa por perfis aderentes",
      tool: "LinkedIn Recruiter",
      role: "Analista de R&S",
    },
    {
      what: "Triar currículos recebidos",
      how: "Corte por requisitos obrigatórios da vaga (senioridade, stack, localização); descarta fora do perfil com motivo registrado no ATS",
      tool: "Gupy (ATS)",
      role: "Analista de R&S",
    },
    {
      what: "Conduzir entrevista de triagem (RH)",
      how: "Bate-papo de 30min sobre motivação, pretensão salarial e disponibilidade",
      tool: "Google Meet",
      role: "Analista de R&S",
    },
    {
      what: "Conduzir entrevista técnica com o gestor da área",
      how: "Avaliação técnica conduzida pelo gestor solicitante, com case ou perguntas do banco da área",
      tool: "Google Meet",
      role: "Gestor da área solicitante",
    },
    {
      what: "Consolidar feedback e decidir aprovação",
      how: "Reunião rápida entre RH e gestor pra alinhar aprovação, reprovação ou próxima etapa",
      tool: "Monday",
      role: "Coordenador de People & Performance",
    },
    {
      what: "Enviar proposta e formalizar admissão",
      how: "Proposta formal por e-mail, alinhamento de data de início, encaminha pro onboarding",
      tool: "Gupy",
      role: "Analista de R&S",
    },
  ];

  return {
    Objetivo: {
      1: {
        kind: "longText",
        value:
          "Garante que toda vaga aberta na ECCOX seja preenchida com o candidato certo, no prazo combinado, com um processo seletivo estruturado — do sourcing até a proposta formal.",
      },
    },
    Responsável: {
      1: { kind: "text", value: "Coordenador de People & Performance" },
      2: {
        kind: "list",
        value: ["Analista de Recrutamento & Seleção", "Gestor da área solicitante"],
      },
    },
    Ferramentas: {
      1: { kind: "list", value: ["Gupy (ATS)", "LinkedIn Recruiter", "Google Meet", "Monday"] },
    },
    Passos: {
      1: { kind: "text", value: "Abertura de requisição de vaga aprovada pelo orçamento" },
      2: { kind: "steps", value: steps },
    },
  };
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exitCode = 1;
  });
