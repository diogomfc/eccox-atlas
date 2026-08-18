"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { FlowDiagram } from "@/components/documents/flow-diagram";
import { Button } from "@/components/ui/button";
import type { FlowEdgeData, FlowNodeData } from "@/lib/documents/flow";

interface FlowFullscreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
  title: string;
}

/** Modal de tela cheia do fluxo, com pan/zoom liberado. Não usa o Dialog do
 * shadcn (Base UI) de propósito — não há padrão de Dialog+motion no projeto
 * ainda, e aqui a transição pedida é a de `motion`/AnimatePresence. */
export function FlowFullscreenModal({
  open,
  onOpenChange,
  nodes,
  edges,
  title,
}: FlowFullscreenModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="absolute inset-4 flex flex-col overflow-hidden rounded-xl border border-border bg-surface sm:inset-8"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <p className="label-caps">Desenho do processo</p>
                <h2 className="font-semibold tracking-tight">{title}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Fechar"
                onClick={() => onOpenChange(false)}
              >
                <X />
              </Button>
            </div>
            <div className="flex-1">
              <FlowDiagram nodes={nodes} edges={edges} interactive className="h-full" />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
