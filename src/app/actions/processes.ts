"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { DEFAULT_PROCESS_SECTIONS } from "@/lib/process-templates/default-questions";

async function requireGestor() {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") {
    throw new Error("Só um gestor pode gerenciar processos.");
  }
  return session;
}

const priorityEnum = z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]);

const createSchema = z.object({
  areaId: z.string().min(1),
  name: z.string().trim().min(1, "Informe o nome do processo."),
  objective: z.string().trim().optional(),
  relatedPolicyRef: z.string().trim().optional(),
  priority: priorityEnum.default("MEDIA"),
  ownerId: z.string().trim().optional(),
  startFromTemplate: z.boolean().default(true),
  /** Só quando startFromTemplate=false: clona o roteiro de outro processo
   * (marcado isCustomTemplate) em vez de aplicar o padrão POP V3. */
  templateProcessId: z.string().trim().optional(),
});

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/** Gera POP-<SIGLA>-<seq> olhando o maior código já usado na área. */
async function nextProcessCode(areaId: string): Promise<string> {
  const area = await db.area.findUniqueOrThrow({ where: { id: areaId } });
  const last = await db.process.findFirst({
    where: { areaId },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastSeq = last ? Number(last.code.split("-").pop()) || 0 : 0;
  return `POP-${area.sigla}-${String(lastSeq + 1).padStart(3, "0")}`;
}

export async function createProcess(input: unknown): Promise<ActionResult> {
  await requireGestor();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const {
    areaId,
    name,
    objective,
    relatedPolicyRef,
    priority,
    ownerId,
    startFromTemplate,
    templateProcessId,
  } = parsed.data;

  const code = await nextProcessCode(areaId);
  const process = await db.process.create({
    data: {
      areaId,
      code,
      name,
      objective: objective || null,
      relatedPolicyRef: relatedPolicyRef || null,
      priority,
      ownerId: ownerId || null,
      isCustomTemplate: !startFromTemplate,
    },
  });

  if (startFromTemplate) {
    for (const section of DEFAULT_PROCESS_SECTIONS) {
      await db.processSection.create({
        data: {
          processId: process.id,
          label: section.label,
          order: section.order,
          questions: {
            createMany: {
              data: section.questions.map((question) => ({ ...question, processId: process.id })),
            },
          },
        },
      });
    }
  } else if (templateProcessId) {
    const templateSections = await db.processSection.findMany({
      where: { processId: templateProcessId },
      orderBy: { order: "asc" },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    for (const section of templateSections) {
      await db.processSection.create({
        data: {
          processId: process.id,
          label: section.label,
          order: section.order,
          questions: {
            createMany: {
              data: section.questions.map((question) => ({
                processId: process.id,
                order: question.order,
                questionText: question.questionText,
                helperText: question.helperText,
                inputKind: question.inputKind,
                placeholder: question.placeholder,
                required: question.required,
                allowEvidence: question.allowEvidence,
              })),
            },
          },
        },
      });
    }
  }

  revalidatePath("/processos");
  return { ok: true, id: process.id };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  objective: z.string().trim().optional(),
  relatedPolicyRef: z.string().trim().optional(),
  areaId: z.string().min(1).optional(),
  priority: priorityEnum.optional(),
  ownerId: z.string().trim().optional(),
});

export async function updateProcess(input: unknown): Promise<ActionResult> {
  await requireGestor();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const { id, name, objective, relatedPolicyRef, areaId, priority, ownerId } = parsed.data;
  await db.process.update({
    where: { id },
    data: {
      name,
      objective: objective || null,
      relatedPolicyRef: relatedPolicyRef || null,
      ...(areaId ? { areaId } : {}),
      ...(priority ? { priority } : {}),
      ...(ownerId !== undefined ? { ownerId: ownerId || null } : {}),
    },
  });

  revalidatePath(`/processos/${id}`);
  revalidatePath(`/administracao/processos/${id}`);
  revalidatePath("/processos");
  return { ok: true };
}

export async function deleteProcess(id: string): Promise<ActionResult> {
  await requireGestor();
  await db.process.delete({ where: { id } });
  revalidatePath("/processos");
  return { ok: true };
}

/** Processos com roteiro personalizado da mesma área — candidatos a "usar
 * como modelo" no cadastro de um processo novo. */
export async function listTemplateProcesses(areaId: string) {
  await requireGestor();
  const processes = await db.process.findMany({
    where: { areaId, isCustomTemplate: true },
    select: { id: true, code: true, name: true, _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });
  return processes.filter((process) => process._count.questions > 0);
}

// ---------------------------------------------------------------------------
// Grupos (ProcessSection) — o gestor pode criar/renomear/excluir livremente.
// ---------------------------------------------------------------------------

const sectionSchema = z.object({
  processId: z.string().min(1),
  label: z.string().trim().min(1, "Digite o nome do grupo."),
});

export async function addSection(input: unknown): Promise<ActionResult> {
  await requireGestor();
  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { processId, label } = parsed.data;

  const last = await db.processSection.findFirst({
    where: { processId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const section = await db.processSection.create({
    data: { processId, label, order: (last?.order ?? 0) + 1 },
  });

  revalidatePath(`/administracao/processos/${processId}`);
  return { ok: true, id: section.id };
}

const updateSectionSchema = z.object({
  id: z.string().min(1),
  processId: z.string().min(1),
  label: z.string().trim().min(1, "Digite o nome do grupo."),
});

export async function updateSection(input: unknown): Promise<ActionResult> {
  await requireGestor();
  const parsed = updateSectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, processId, label } = parsed.data;
  await db.processSection.update({ where: { id }, data: { label } });
  revalidatePath(`/administracao/processos/${processId}`);
  return { ok: true };
}

/** Exclui o grupo e suas perguntas (cascade). Bloqueado se for o único grupo
 * do processo — o roteiro não pode ficar sem nenhum grupo. */
export async function deleteSection(id: string, processId: string): Promise<ActionResult> {
  await requireGestor();
  const count = await db.processSection.count({ where: { processId } });
  if (count <= 1) {
    return { ok: false, error: "O processo precisa de pelo menos um grupo de perguntas." };
  }
  await db.processSection.delete({ where: { id } });
  revalidatePath(`/administracao/processos/${processId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Perguntas dentro de um grupo.
// ---------------------------------------------------------------------------

const questionSchema = z.object({
  processId: z.string().min(1),
  sectionId: z.string().min(1),
  questionText: z.string().trim().min(1, "Digite a pergunta."),
  helperText: z.string().trim().optional(),
  inputKind: z.enum(["TEXT", "LONG_TEXT", "NUMBER", "LIST", "STEPS"]),
  placeholder: z.string().trim().optional(),
  required: z.boolean().default(true),
  allowEvidence: z.boolean().default(false),
  /// Só LIST ou STEPS marcam o fluxo — outros tipos não representam sequência.
  isFlowSource: z.boolean().default(false),
});

export async function addQuestion(input: unknown): Promise<ActionResult> {
  await requireGestor();
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { processId, sectionId, isFlowSource } = parsed.data;
  const last = await db.processQuestion.findFirst({
    where: { sectionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const question = await db.$transaction(async (tx) => {
    if (isFlowSource) {
      await tx.processQuestion.updateMany({
        where: { processId, isFlowSource: true },
        data: { isFlowSource: false },
      });
    }
    return tx.processQuestion.create({
      data: { ...parsed.data, order: (last?.order ?? 0) + 1 },
    });
  });

  revalidatePath(`/administracao/processos/${processId}`);
  return { ok: true, id: question.id };
}

const updateQuestionSchema = questionSchema.extend({ id: z.string().min(1) });

export async function updateQuestion(input: unknown): Promise<ActionResult> {
  await requireGestor();
  const parsed = updateQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const { id, processId, ...data } = parsed.data;

  await db.$transaction(async (tx) => {
    if (data.isFlowSource) {
      await tx.processQuestion.updateMany({
        where: { processId, isFlowSource: true, NOT: { id } },
        data: { isFlowSource: false },
      });
    }
    await tx.processQuestion.update({ where: { id }, data });
  });

  revalidatePath(`/administracao/processos/${processId}`);
  return { ok: true };
}

export async function deleteQuestion(id: string, processId: string): Promise<ActionResult> {
  await requireGestor();
  await db.processQuestion.delete({ where: { id } });
  revalidatePath(`/administracao/processos/${processId}`);
  return { ok: true };
}

/** Troca o `order` com o vizinho imediato dentro do mesmo grupo — reordenação
 * simples, sem drag-and-drop. */
export async function moveQuestion(
  id: string,
  processId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireGestor();
  const question = await db.processQuestion.findUniqueOrThrow({ where: { id } });

  const neighbor = await db.processQuestion.findFirst({
    where: {
      sectionId: question.sectionId,
      order: direction === "up" ? { lt: question.order } : { gt: question.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return { ok: true };

  // Troca em 3 passos: a coluna tem @@unique([sectionId, order]), e um swap
  // direto colidiria por um instante mesmo dentro da transação.
  await db.$transaction([
    db.processQuestion.update({ where: { id: question.id }, data: { order: -1 } }),
    db.processQuestion.update({ where: { id: neighbor.id }, data: { order: question.order } }),
    db.processQuestion.update({ where: { id: question.id }, data: { order: neighbor.order } }),
  ]);

  revalidatePath(`/administracao/processos/${processId}`);
  return { ok: true };
}
