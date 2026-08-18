import { Readable } from "node:stream";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getFileStreamFromMinio } from "@/lib/storage/minio";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) return new Response(null, { status: 404 });

  const attachment = await db.answerAttachment.findUnique({
    where: { id },
    include: { interview: { include: { link: true } } },
  });
  if (!attachment) return new Response(null, { status: 404 });

  const isGestor = session.user.role === "GESTOR";
  const isRespondent = attachment.interview?.link.respondentUserId === session.user.id;
  if (!isGestor && !isRespondent) return new Response(null, { status: 404 });

  try {
    const nodeStream = await getFileStreamFromMinio(attachment.s3Key);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename="${attachment.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
