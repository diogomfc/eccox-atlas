"use client";

import { Loader2, Pencil, Sparkles, User, X } from "lucide-react";
import { useState, useTransition } from "react";
import {
  consolidateSingleQuestionAction,
  updateConsolidatedAnswerAction,
} from "@/app/actions/consolidation";
import { AnswerInput } from "@/components/interview/answer-input";
import type { AttachmentItem } from "@/components/interview/question-attachment-dropzone";
import { QuestionAttachmentDropzone } from "@/components/interview/question-attachment-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProcessQuestion } from "@/generated/prisma/client";
import type { Answer } from "@/lib/interview/answers";
import { answerToText, emptyAnswer, isAnswerEmpty } from "@/lib/interview/answers";
import { cn } from "@/lib/utils";

interface ConsolidatedAnswerItemProps {
  processId: string;
  question: ProcessQuestion;
  value: Answer | null;
  isAiGenerated: boolean;
  editedByName: string | null;
  rationale: string | null;
  attachments: AttachmentItem[];
  /** Quantas entrevistas APROVADA responderam esta pergunta — o botão de
   * consolidar individual só aparece com 2 ou mais (1 já é cópia direta,
   * não precisa de IA). */
  approvedAnswerCount: number;
}

export function ConsolidatedAnswerItem({
  processId,
  question,
  value,
  isAiGenerated,
  editedByName,
  rationale,
  attachments,
  approvedAnswerCount,
}: ConsolidatedAnswerItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Answer>(value ?? emptyAnswer(question.inputKind));
  const [pending, startTransition] = useTransition();
  const [consolidating, startConsolidate] = useTransition();
  const [consolidateError, setConsolidateError] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      await updateConsolidatedAnswerAction({
        processId,
        questionId: question.id,
        answer: draft,
      });
      setEditing(false);
    });
  }

  function handleConsolidateOne() {
    setConsolidateError(null);
    startConsolidate(async () => {
      const result = await consolidateSingleQuestionAction(processId, question.id);
      if (!result.ok) setConsolidateError(result.error ?? "Não foi possível consolidar.");
    });
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border border-ring bg-surface p-3">
        <AnswerInput question={question} value={draft} onChange={setDraft} disabled={pending} />
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={handleSave}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Salvar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setDraft(value ?? emptyAnswer(question.inputKind));
              setEditing(false);
            }}
          >
            <X data-icon="inline-start" />
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  const filled = value !== null && !isAnswerEmpty(value);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "flex-1 text-sm leading-6 whitespace-pre-wrap",
            filled ? "text-brand" : "text-muted-foreground italic",
          )}
        >
          {filled ? answerToText(value) : "Sem resposta registrada."}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {!isAiGenerated && approvedAnswerCount >= 2 ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Consolidar esta pergunta com IA"
              disabled={consolidating}
              onClick={handleConsolidateOne}
            >
              {consolidating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles className="text-brand" />
              )}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Editar resposta definitiva"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
        </div>
      </div>

      {filled ? (
        <div className="flex items-center gap-2">
          {isAiGenerated ? (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3" />
              Consolidado via IA
            </Badge>
          ) : editedByName ? (
            <Badge variant="secondary" className="gap-1">
              <User className="size-3" />
              Editado por {editedByName}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {rationale ? <p className="text-xs text-muted-foreground italic">{rationale}</p> : null}
      {consolidateError ? <p className="text-xs text-destructive">{consolidateError}</p> : null}

      {question.allowEvidence ? (
        <QuestionAttachmentDropzone
          processId={processId}
          questionId={question.id}
          attachments={attachments}
          readOnly
        />
      ) : null}
    </div>
  );
}
