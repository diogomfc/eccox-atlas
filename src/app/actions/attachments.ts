"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { deleteMinioFile, ensureBucketExists, uploadFileToMinio } from "@/lib/storage/minio";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "text/plain",
]);

const metaSchema = z.object({
  processId: z.string().min(1),
  questionId: z.string().min(1),
  interviewId: z.string().min(1).optional(),
});

export interface AttachmentActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

/**
 * Confere quem pode anexar evidência: gestor sempre pode (em qualquer
 * pergunta/processo); colaborador só se `interviewId` for exatamente a
 * entrevista dele — mesma checagem de identidade usada em
 * src/app/entrevista/[token]/page.tsx.
 */
async function requireUploadPermission(interviewId: string | undefined) {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role === "GESTOR") return session;

  if (!interviewId) return null;
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    include: { link: true },
  });
  if (!interview || interview.link.respondentUserId !== session.user.id) return null;
  return session;
}

export async function uploadAttachmentAction(formData: FormData): Promise<AttachmentActionResult> {
  const parsed = metaSchema.safeParse({
    processId: formData.get("processId"),
    questionId: formData.get("questionId"),
    interviewId: formData.get("interviewId") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { processId, questionId, interviewId } = parsed.data;

  const session = await requireUploadPermission(interviewId);
  if (!session) return { ok: false, error: "Sem permissão para anexar evidência aqui." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Nenhum arquivo enviado." };
  if (file.size === 0) return { ok: false, error: "Arquivo vazio." };
  if (file.size > MAX_SIZE_BYTES) return { ok: false, error: "Arquivo maior que 20MB." };
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Formato não aceito. Use imagem, PDF, Word, Excel, CSV ou texto." };
  }

  const question = await db.processQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.processId !== processId) {
    return { ok: false, error: "Pergunta não encontrada neste processo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-120);
  const s3Key = `${processId}/${questionId}/${nanoid(12)}-${safeName}`;

  try {
    await ensureBucketExists();
    await uploadFileToMinio(s3Key, buffer, file.type);
  } catch (error) {
    console.error("[attachments] upload no MinIO falhou:", error);
    return {
      ok: false,
      error: "Servidor de arquivos indisponível agora. Tente de novo em instantes.",
    };
  }

  const attachment = await db.answerAttachment.create({
    data: {
      processId,
      questionId,
      interviewId: interviewId ?? null,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      s3Key,
      uploadedById: session.user.id,
    },
  });

  revalidatePath(`/processos/${processId}`);
  if (interviewId) revalidatePath(`/entrevistas/${interviewId}`);
  return { ok: true, id: attachment.id };
}

export async function deleteAttachmentAction(
  attachmentId: string,
): Promise<AttachmentActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Faça login." };

  const attachment = await db.answerAttachment.findUnique({
    where: { id: attachmentId },
    include: { interview: { include: { link: true } } },
  });
  if (!attachment) return { ok: false, error: "Anexo não encontrado." };

  const isOwner = attachment.uploadedById === session.user.id;
  const isRespondent = attachment.interview?.link.respondentUserId === session.user.id;
  const isGestor = session.user.role === "GESTOR";
  if (!isGestor && !isOwner && !isRespondent) {
    return { ok: false, error: "Sem permissão para remover este anexo." };
  }

  await deleteMinioFile(attachment.s3Key).catch(() => {
    // Se o objeto já não existir no MinIO, segue removendo o registro —
    // não deixa um anexo "fantasma" travado no banco por causa disso.
  });
  await db.answerAttachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/processos/${attachment.processId}`);
  if (attachment.interviewId) revalidatePath(`/entrevistas/${attachment.interviewId}`);
  return { ok: true };
}
