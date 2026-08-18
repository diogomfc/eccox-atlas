import "server-only";
import { db } from "@/lib/db";
import { buildFlowFromSteps } from "@/lib/documents/flow";
import {
  buildSections,
  extractGatilho,
  extractSteps,
  sectionsToMarkdown,
} from "@/lib/documents/sections";
import { toJson } from "@/lib/json";

const MAX_ELABORADO_POR_NAMES = 4;

/**
 * Monta uma nova versão do Document a partir das respostas da entrevista.
 * Montagem direta — sem IA. Chamado ao enviar a entrevista (versão rascunho,
 * `isDraft: true`) e de novo a cada reenvio após revisão solicitada.
 */
export async function generateDocumentFromInterview(interviewId: string): Promise<string> {
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

/**
 * Monta/atualiza o Document oficial a partir das `ConsolidatedAnswer` do
 * processo — a fonte de verdade passa a ser a resposta definitiva por
 * pergunta (uma só, já unificada entre os respondentes), não mais a
 * entrevista de uma pessoa só. Chamado pela consolidação
 * (`src/lib/documents/consolidation.ts`) e sempre que o gestor edita uma
 * resposta definitiva manualmente.
 *
 * Enquanto o documento ainda não foi aprovado (`isDraft: true`), reconsolidar
 * ou editar uma resposta ATUALIZA a mesma versão em vez de criar uma nova —
 * senão cada ajuste manual criaria uma versão nova, poluindo o histórico.
 * Uma vez aprovado, a próxima consolidação SÓ abre uma versão nova de verdade
 * se o conteúdo realmente mudou (uma revisão pós-aprovação) — reconsolidar
 * sem nenhuma mudança real (ex: só recalculando o mesmo conteúdo) não pode
 * criar um rascunho novo do nada e fazer um processo já aprovado parecer
 * "aguardando aprovação" de novo.
 */
export async function generateDocumentFromConsolidatedAnswers(processId: string): Promise<string> {
  const proc = await db.process.findUniqueOrThrow({
    where: { id: processId },
    include: { area: true },
  });

  const consolidatedAnswers = await db.consolidatedAnswer.findMany({
    where: { processId },
    include: { question: { include: { section: true } } },
  });

  const answeredQuestions = consolidatedAnswers.map((row) => ({
    question: row.question,
    valueJson: row.valueJson,
  }));

  const sections = buildSections(answeredQuestions);
  const contentMarkdown = sectionsToMarkdown(proc.name, proc.code, proc.area.name, sections);

  const contributors = await db.interview.findMany({
    where: { link: { processId }, status: { in: ["ENVIADA", "APROVADA"] } },
    include: { link: { include: { respondent: true } } },
  });
  const names = [...new Set(contributors.map((interview) => interview.link.respondent.name))];
  const elaboradoPor =
    names.length > MAX_ELABORADO_POR_NAMES
      ? `${names.slice(0, MAX_ELABORADO_POR_NAMES).join(", ")} e outros`
      : names.join(", ") || "Consolidação sem entrevistas";

  const latest = await db.document.findFirst({
    where: { processId },
    orderBy: { version: "desc" },
  });

  const contentUnchanged = latest !== null && latest.contentMarkdown === contentMarkdown;

  const document = contentUnchanged
    ? latest
    : latest?.isDraft
      ? await db.document.update({
          where: { id: latest.id },
          data: { sectionsJson: toJson(sections), contentMarkdown, elaboradoPor },
        })
      : await db.document.create({
          data: {
            processId,
            version: (latest?.version ?? 0) + 1,
            sectionsJson: toJson(sections),
            contentMarkdown,
            isDraft: true,
            elaboradoPor,
            dataElaboracao: new Date(),
          },
        });

  // Uma revisão nova de verdade depois de já aprovado deixa de fazer sentido
  // como "Aprovado" — senão o badge do processo e o do Document se contradizem
  // (um diz aprovado, o outro diz rascunho aguardando aprovação). Volta pra
  // EM_REVISAO até alguém aprovar essa revisão também.
  if (!contentUnchanged && latest && !latest.isDraft) {
    await db.process.update({ where: { id: processId }, data: { status: "EM_REVISAO" } });
  }

  const gatilho = extractGatilho(answeredQuestions);
  const steps = extractSteps(answeredQuestions);
  const flow = buildFlowFromSteps(gatilho, steps);

  if (flow) {
    await db.flowGraph.upsert({
      where: { documentId_kind: { documentId: document.id, kind: "AS_IS" } },
      update: { nodesJson: toJson(flow.nodes), edgesJson: toJson(flow.edges) },
      create: {
        documentId: document.id,
        kind: "AS_IS",
        nodesJson: toJson(flow.nodes),
        edgesJson: toJson(flow.edges),
      },
    });
  }

  return document.id;
}
