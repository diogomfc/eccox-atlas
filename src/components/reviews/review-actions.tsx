"use client";

import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveInterview, requestRevision } from "@/app/actions/review";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewActions({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function approve() {
    setError(null);
    startTransition(async () => {
      const result = await approveInterview(interviewId);
      if (!result.ok) {
        setError(result.error ?? null);
        return;
      }
      router.refresh();
    });
  }

  function sendRevision() {
    setError(null);
    startTransition(async () => {
      const result = await requestRevision({ interviewId, comment });
      if (!result.ok) {
        setError(result.error ?? null);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="surface-panel space-y-3 p-5">
      {showRevision ? (
        <div className="space-y-2">
          <Textarea
            autoFocus
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="O que precisa ser ajustado?"
          />
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending || !comment.trim()} onClick={sendRevision}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Enviar solicitação
            </Button>
            <Button variant="ghost" onClick={() => setShowRevision(false)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button disabled={pending} onClick={approve}>
            {pending ? <Loader2 className="animate-spin" /> : <Check data-icon="inline-start" />}
            Aprovar
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => setShowRevision(true)}>
            <X data-icon="inline-start" />
            Solicitar revisão
          </Button>
        </div>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <p className="text-xs text-muted-foreground">
        Isso sinaliza que a resposta desta pessoa está boa — não aprova o processo. A aprovação
        final acontece na visão consolidada, depois de "Consolidar com IA".
      </p>
    </div>
  );
}
