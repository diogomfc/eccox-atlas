import { Readable } from "node:stream";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getFileStreamFromMinio } from "@/lib/storage/minio";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const inline = url.searchParams.get("inline") === "true";

  const session = await auth();
  if (!session?.user) {
    console.warn(`[attachments/api] Sessão ausente ao acessar anexo ${id}`);
    return new Response("Unauthorized", { status: 401 });
  }

  const attachment = await db.answerAttachment.findUnique({
    where: { id },
    include: {
      interview: { include: { link: true } },
      process: { include: { links: true } },
    },
  });
  if (!attachment) {
    console.warn(`[attachments/api] Anexo ${id} não encontrado no banco`);
    return new Response("Not found", { status: 404 });
  }

  const isGestor = session.user.role === "GESTOR";
  const isOwner = attachment.uploadedById === session.user.id;
  const isRespondent =
    attachment.interview?.link.respondentUserId === session.user.id ||
    attachment.process.links.some((l: { respondentUserId: string }) => l.respondentUserId === session.user.id);

  if (!isGestor && !isOwner && !isRespondent) {
    console.warn(`[attachments/api] Acesso negado ao anexo ${id} para usuário ${session.user.id}`);
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const nodeStream = await getFileStreamFromMinio(attachment.s3Key);
    const webStream = Readable.toWeb(nodeStream);

    const safeFileName = encodeURIComponent(attachment.fileName);
    const disposition = inline
      ? `inline; filename="${safeFileName}"; filename*=UTF-8''${safeFileName}`
      : `attachment; filename="${safeFileName}"; filename*=UTF-8''${safeFileName}`;

    return new Response(webStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": disposition,
        "Content-Length": String(attachment.fileSize),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(`[attachments/api] Erro ao buscar anexo ${id} (${attachment.s3Key}) no MinIO:`, error);
    return new Response("Error fetching file", { status: 500 });
  }
}

