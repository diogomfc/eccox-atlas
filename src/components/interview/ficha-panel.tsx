import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { SectionProgress } from "@/lib/interview/answers";
import { cn } from "@/lib/utils";

interface FichaPanelProps {
  sections: SectionProgress[];
  /** Renderizado dentro do mesmo card, depois da lista — fica fixo junto com
   * o card ao rolar a página (ex: "Salvar e continuar depois"). */
  footer?: ReactNode;
}

/**
 * Resumo de progresso simples e determinístico — sem IA, sem extração de
 * fatos. Só mostra o que já foi preenchido, seção por seção.
 */
export function FichaPanel({ sections, footer }: FichaPanelProps) {
  return (
    <aside className="surface-panel h-fit p-5 lg:sticky lg:top-24">
      <h2 className="label-caps">Progresso</h2>

      <ul className="mt-3 space-y-2.5">
        {sections.map((section) => {
          const done = section.total > 0 && section.answered === section.total;
          return (
            <li key={section.sectionId} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.625rem]",
                  done
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" /> : section.answered}
              </span>
              <span className={done ? "text-foreground" : "text-muted-foreground"}>
                {section.label}
              </span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {section.answered}/{section.total}
              </span>
            </li>
          );
        })}
      </ul>

      {footer ? (
        <div className="mt-4 flex justify-center border-t border-border pt-4">{footer}</div>
      ) : null}
    </aside>
  );
}
