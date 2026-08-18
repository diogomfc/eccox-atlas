import type { Wave } from "@/generated/prisma/client";
import { WAVE_LABEL, WAVE_ORDER } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const WAVE_COLOR: Record<Wave, string> = {
  ONDA_1: "var(--wave-1)",
  ONDA_2: "var(--wave-2)",
  ONDA_3: "var(--wave-3)",
  CONCLUIDO: "var(--wave-done)",
};

interface WaveBarProps {
  waves: Record<Wave, number>;
  className?: string;
  /** Mostra a legenda com os numeros por onda abaixo da barra. */
  withLegend?: boolean;
}

/**
 * Distribuicao dos artefatos por onda. A onda e ordinal (1 = mais urgente),
 * por isso a rampa e sequencial de um unico matiz; "Concluido" e estado, nao
 * urgencia, e sai da rampa. Os numeros aparecem sempre — o passo mais claro da
 * rampa fica abaixo de 3:1 de contraste de proposito.
 */
export function WaveBar({ waves, className, withLegend = true }: WaveBarProps) {
  const total = WAVE_ORDER.reduce((sum, wave) => sum + waves[wave], 0);
  if (total === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
        {WAVE_ORDER.map((wave) =>
          waves[wave] > 0 ? (
            <div
              key={wave}
              style={{ flexGrow: waves[wave], backgroundColor: WAVE_COLOR[wave] }}
              title={`${WAVE_LABEL[wave]}: ${waves[wave]}`}
            />
          ) : null,
        )}
      </div>

      {withLegend ? (
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {WAVE_ORDER.map((wave) =>
            waves[wave] > 0 ? (
              <li key={wave} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: WAVE_COLOR[wave] }}
                />
                {WAVE_LABEL[wave]}
                <span className="font-mono text-foreground">{waves[wave]}</span>
              </li>
            ) : null,
          )}
        </ul>
      ) : null}
    </div>
  );
}
