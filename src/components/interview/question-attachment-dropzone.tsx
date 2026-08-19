"use client";

import {
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { deleteAttachmentAction, uploadAttachmentAction } from "@/app/actions/attachments";
import { AttachmentLightbox } from "@/components/interview/attachment-lightbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AttachmentItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface QuestionAttachmentDropzoneProps {
  processId: string;
  questionId: string;
  /** Setado = upload feito pelo próprio respondente durante o preenchimento.
   * Undefined = upload direto na visão consolidada, pelo gestor. */
  interviewId?: string;
  attachments: AttachmentItem[];
  /** Só lista/baixa — sem upload nem remoção (visão individual de outra pessoa). */
  readOnly?: boolean;
  disabled?: boolean;
}

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    return FileSpreadsheet;
  }
  return FileText;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function QuestionAttachmentDropzone({
  processId,
  questionId,
  interviewId,
  attachments,
  readOnly,
  disabled,
}: QuestionAttachmentDropzoneProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxAttachment, setLightboxAttachment] = useState<AttachmentItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("processId", processId);
      formData.set("questionId", questionId);
      if (interviewId) formData.set("interviewId", interviewId);
      formData.set("file", file);
      const result = await uploadAttachmentAction(formData);
      if (!result.ok) setError(result.error ?? "Não foi possível anexar o arquivo.");
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDelete(attachmentId: string) {
    startTransition(async () => {
      const result = await deleteAttachmentAction(attachmentId);
      if (!result.ok) setError(result.error ?? "Não foi possível remover o anexo.");
    });
  }

  const imageAttachments = attachments.filter((a) => isImage(a.mimeType));
  const fileAttachments = attachments.filter((a) => !isImage(a.mimeType));

  return (
    <div className="space-y-2">
      {/* Thumbnails de imagens */}
      {imageAttachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {imageAttachments.map((attachment) => (
            <div key={attachment.id} className="group relative">
              <button
                type="button"
                className="overflow-hidden rounded-lg border border-border bg-surface transition-all hover:border-ring hover:shadow-md"
                onClick={() => setLightboxAttachment(attachment)}
                aria-label={`Ver ${attachment.fileName}`}
              >
                <img
                  src={`/api/attachments/${attachment.id}?inline=true`}
                  alt={attachment.fileName}
                  className="h-20 w-20 object-cover"
                  loading="lazy"
                />
              </button>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  className="absolute -top-1.5 -right-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  disabled={disabled || pending}
                  aria-label="Remover anexo"
                  onClick={() => handleDelete(attachment.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              ) : null}
              <p className="mt-0.5 max-w-20 truncate text-center text-[0.6rem] text-muted-foreground">
                {attachment.fileName}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Lista de arquivos não-imagem */}
      {fileAttachments.length > 0 ? (
        <ul className="space-y-1.5">
          {fileAttachments.map((attachment) => {
            const Icon = iconFor(attachment.mimeType);
            return (
              <li
                key={attachment.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs"
              >
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <a
                  href={`/api/attachments/${attachment.id}`}
                  download
                  className="min-w-0 flex-1 truncate text-foreground hover:underline"
                >
                  {attachment.fileName}
                </a>
                <span className="shrink-0 text-muted-foreground">
                  {formatSize(attachment.fileSize)}
                </span>
                <a
                  href={`/api/attachments/${attachment.id}`}
                  download
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Baixar ${attachment.fileName}`}
                >
                  <Download className="size-3.5" />
                </a>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled || pending}
                    aria-label="Remover anexo"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(attachment.id)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {!readOnly ? (
        <>
          <button
            type="button"
            disabled={disabled || pending}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFiles(event.dataTransfer.files);
            }}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors",
              dragOver ? "border-ring bg-brand-soft text-foreground" : "border-border",
              (disabled || pending) && "opacity-60",
            )}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {pending ? "Enviando…" : "Anexar evidência (imagem, PDF, planilha…)"}
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.docx,.xlsx,.xls,.csv,.txt"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </>
      ) : attachments.length === 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
          <Paperclip className="size-3.5" />
          Nenhuma evidência anexada.
        </p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {/* Lightbox fullscreen para imagens */}
      {lightboxAttachment ? (
        <AttachmentLightbox
          src={`/api/attachments/${lightboxAttachment.id}?inline=true`}
          fileName={lightboxAttachment.fileName}
          onClose={() => setLightboxAttachment(null)}
        />
      ) : null}
    </div>
  );
}

