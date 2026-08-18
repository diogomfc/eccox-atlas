"use client";

import Link from "next/link";
import { WAVE_COLOR } from "@/components/atlas/wave-bar";
import { ProcessDeleteButton } from "@/components/processes/process-delete-button";
import { Badge } from "@/components/ui/badge";
import { PROCESS_STATUS_STYLE } from "@/lib/badges";
import { WAVE_LABEL } from "@/lib/domain";
import type { AreaDetail } from "@/lib/queries/atlas";

interface ProcessListProps {
  processes: AreaDetail["processes"];
  /** Código da área de origem — vira `?areaFrom=` no link, pra "voltar"
   * do detalhe do processo trazer de volta pra cá em vez da listagem global. */
  areaFrom?: string;
}

export function ProcessList({ processes, areaFrom }: ProcessListProps) {
  if (processes.length === 0) {
    return (
      <p className="surface-panel px-6 py-10 text-center text-sm text-muted-foreground">
        Nenhum processo cadastrado nesta área ainda.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {processes.map((processItem) => (
        <li key={processItem.id} className="group relative">
          <Link
            href={
              areaFrom
                ? { pathname: `/processos/${processItem.id}`, query: { areaFrom } }
                : `/processos/${processItem.id}`
            }
            className="surface-panel block p-4 pr-12 transition-colors hover:border-ring"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[0.6875rem] tracking-widest text-brand">
                {processItem.code}
              </span>
              <span
                className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground"
                title={`Onda: ${WAVE_LABEL[processItem.wave]}`}
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: WAVE_COLOR[processItem.wave] }}
                />
                {WAVE_LABEL[processItem.wave]}
              </span>
              <Badge className={`ml-auto ${PROCESS_STATUS_STYLE[processItem.status].className}`}>
                {PROCESS_STATUS_STYLE[processItem.status].label}
              </Badge>
            </div>

            <h3 className="mt-2 font-medium tracking-tight">{processItem.name}</h3>
            {processItem.objective ? (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {processItem.objective}
              </p>
            ) : null}

            <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] text-muted-foreground">
              {processItem.ownerName ? (
                <div className="flex items-center gap-1">
                  <dt>Dono:</dt>
                  <dd className="text-foreground">{processItem.ownerName}</dd>
                </div>
              ) : null}
              {processItem.relatedPolicyRef ? (
                <div className="flex items-center gap-1">
                  <dt>Política relacionada:</dt>
                  <dd className="text-foreground">{processItem.relatedPolicyRef}</dd>
                </div>
              ) : null}
            </dl>
          </Link>
          <div className="absolute top-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
            <ProcessDeleteButton id={processItem.id} name={processItem.name} />
          </div>
        </li>
      ))}
    </ul>
  );
}
