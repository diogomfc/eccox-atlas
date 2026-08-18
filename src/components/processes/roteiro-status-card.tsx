import type { ReactNode } from "react";

interface RoteiroStatusCardProps {
  icon: ReactNode;
  title: string;
  description?: string;
  progress?: { current: number; total: number };
}

/** Card informativo pro estado do Roteiro Definitivo quando ainda não dá
 * pra mostrar respostas — sem convite, aguardando aprovação, etc. */
export function RoteiroStatusCard({ icon, title, description, progress }: RoteiroStatusCardProps) {
  return (
    <div className="surface-panel flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {progress ? (
        <div className="w-full max-w-xs space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
            />
          </div>
          <p className="font-mono text-[0.6875rem] text-muted-foreground">
            {progress.current} de {progress.total} aprovadas
          </p>
        </div>
      ) : null}
    </div>
  );
}
