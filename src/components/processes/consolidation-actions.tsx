"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { approveProcessAction, consolidateInterviewsAction } from "@/app/actions/consolidation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ConsolidationActionsProps {
  processId: string;
  totalInvites: number;
  approvedCount: number;
  hasConsolidated: boolean;
  hasDocument: boolean;
  isApproved: boolean;
}

export function ConsolidationActions({
  processId,
  totalInvites,
  approvedCount,
  hasConsolidated,
  hasDocument,
  isApproved,
}: ConsolidationActionsProps) {
  const router = useRouter();
  const [consolidating, startConsolidate] = useTransition();
  const [approving, startApprove] = useTransition();

  const allApproved = totalInvites > 0 && approvedCount === totalInvites;
  const isSingle = totalInvites === 1;

  function handleConsolidate() {
    startConsolidate(async () => {
      await consolidateInterviewsAction(processId);
      router.refresh();
    });
  }

  function handleApprove() {
    startApprove(async () => {
      await approveProcessAction(processId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {totalInvites === 0 || !allApproved ? (
        totalInvites > 1 && !allApproved ? (
          <Button variant="outline" size="sm" disabled>
            <Sparkles data-icon="inline-start" />
            Aguardando aprovação ({approvedCount}/{totalInvites})
          </Button>
        ) : null
      ) : hasConsolidated ? (
        isSingle ? (
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3" />
            Respostas definitivas aplicadas (1 entrevista)
          </Badge>
        ) : (
          <Button variant="outline" size="sm" disabled={consolidating} onClick={handleConsolidate}>
            {consolidating ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            Reconsolidar
          </Button>
        )
      ) : (
        // Elegível mas ainda sem ConsolidatedAnswer — cobre tanto o caso normal
        // (ninguém clicou ainda) quanto um processo antigo aprovado antes dessa
        // aplicação existir: sempre precisa ter uma ação pra sair desse estado.
        <Button variant="outline" size="sm" disabled={consolidating} onClick={handleConsolidate}>
          {consolidating ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Sparkles data-icon="inline-start" />
          )}
          {isSingle ? "Aplicar como definitivo" : "Consolidar com IA"}
        </Button>
      )}

      {hasDocument && !isApproved && allApproved ? (
        <Button size="sm" disabled={approving} onClick={handleApprove}>
          {approving ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <CheckCircle2 data-icon="inline-start" />
          )}
          Aprovar processo
        </Button>
      ) : null}
    </div>
  );
}
