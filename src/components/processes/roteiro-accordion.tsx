import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface RoteiroAccordionItem {
  questionId: string;
  questionText: string;
  /** Conteúdo abaixo da pergunta — texto da resposta, badges, anexos, edição.
   * Cada tela (consolidada, individual) compõe o que faz sentido pra ela. */
  content: ReactNode;
}

export interface RoteiroAccordionGroup {
  sectionId: string;
  label: string;
  items: RoteiroAccordionItem[];
}

/**
 * Roteiro do processo em Accordion, um grupo por seção — extraído de
 * `/processos/[id]` pra ser reusado também na visão individual de
 * `/entrevistas/[id]` (mesma estrutura visual, conteúdo por pergunta muda).
 */
export function RoteiroAccordion({ groups }: { groups: RoteiroAccordionGroup[] }) {
  return (
    <div className="surface-panel px-5">
      <Accordion
        defaultValue={groups.map((group) => group.sectionId)}
        className="divide-y divide-border"
      >
        {groups.map((group, index) => (
          <AccordionItem key={group.sectionId} value={group.sectionId}>
            <AccordionTrigger>
              {index + 1}. {group.label}
            </AccordionTrigger>
            <AccordionContent>
              {group.items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma pergunta neste grupo.
                </p>
              ) : (
                <div className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.questionId} className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {item.questionText}
                      </p>
                      {item.content}
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
