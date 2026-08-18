import { cn } from "@/lib/utils";

interface CoverageRingProps {
  covered: number;
  total: number;
  size?: number;
  className?: string;
}

/**
 * Medidor de valor unico: quantos artefatos da area ja tem documento gerado.
 * Um so matiz (a marca) — nao ha categorias aqui para distinguir por cor.
 * O numero fica sempre visivel, entao o anel nunca carrega a informacao sozinho.
 */
export function CoverageRing({ covered, total, size = 44, className }: CoverageRingProps) {
  const ratio = total > 0 ? covered / total : 0;
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${covered} de ${total} artefatos documentados`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[0.625rem] text-muted-foreground">
        {covered}/{total}
      </span>
    </div>
  );
}
