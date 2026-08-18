"use client";

import { Loader2, Maximize2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlowDiagram } from "@/components/documents/flow-diagram";
import { FlowFullscreenModal } from "@/components/documents/flow-fullscreen-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FlowEdgeData, FlowNodeData } from "@/lib/documents/flow";
import { cn } from "@/lib/utils";

interface FlowSet {
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
}

interface FlowComparisonSectionProps {
  processName: string;
  asIs: FlowSet;
  toBe: (FlowSet & { rationale: string | null }) | null;
  /** Gestor + processo aprovado — só nesse caso a ação de gerar aparece. */
  canGenerate: boolean;
  onGenerate?: () => Promise<{ ok: boolean; error?: string }>;
}

/** Seção 5 — "Hoje" (AS_IS, sempre existe) vs "IA-First" (TO_BE, sugestão
 * explícita gerada sob demanda pelo gestor, nunca automática). */
export function FlowComparisonSection({
  processName,
  asIs,
  toBe,
  canGenerate,
  onGenerate,
}: FlowComparisonSectionProps) {
  const router = useRouter();
  const [fullscreen, setFullscreen] = useState<"hoje" | "ia-first" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    if (!onGenerate) return;
    setError(null);
    startTransition(async () => {
      const result = await onGenerate();
      if (!result.ok) {
        setError(result.error ?? "Não foi possível gerar a sugestão.");
        return;
      }
      router.refresh();
    });
  }

  if (!toBe) {
    return (
      <div className="no-print space-y-3">
        <FlowPreview nodes={asIs.nodes} edges={asIs.edges} onExpand={() => setFullscreen("hoje")} />
        {canGenerate ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
            <Sparkles className="size-4 shrink-0 text-brand" />
            <p className="flex-1 text-xs text-muted-foreground">
              Peça pra IA sugerir uma versão deste fluxo com menos passos manuais — automação e
              agentes de IA sobre as mesmas ferramentas de hoje.
            </p>
            <Button size="sm" variant="outline" onClick={handleGenerate} disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              Gerar sugestão IA-First
            </Button>
          </div>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <FlowFullscreenModal
          open={fullscreen === "hoje"}
          onOpenChange={(open) => setFullscreen(open ? "hoje" : null)}
          nodes={asIs.nodes}
          edges={asIs.edges}
          title={processName}
        />
      </div>
    );
  }

  return (
    <div className="no-print space-y-3">
      <Tabs defaultValue="hoje">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="ia-first">
              <Sparkles className="size-3.5" />
              IA-First
            </TabsTrigger>
          </TabsList>
          {canGenerate ? (
            <Button size="sm" variant="ghost" onClick={handleGenerate} disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              Gerar de novo
            </Button>
          ) : null}
        </div>

        <TabsContent value="hoje" className="pt-3">
          <FlowPreview
            nodes={asIs.nodes}
            edges={asIs.edges}
            onExpand={() => setFullscreen("hoje")}
          />
        </TabsContent>
        <TabsContent value="ia-first" className="space-y-3 pt-3">
          <FlowPreview
            nodes={toBe.nodes}
            edges={toBe.edges}
            onExpand={() => setFullscreen("ia-first")}
            accent
          />
          {toBe.rationale ? (
            <div className="surface-panel flex items-start gap-2.5 p-3">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand" />
              <p className="text-xs text-muted-foreground">{toBe.rationale}</p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <FlowFullscreenModal
        open={fullscreen === "hoje"}
        onOpenChange={(open) => setFullscreen(open ? "hoje" : null)}
        nodes={asIs.nodes}
        edges={asIs.edges}
        title={processName}
      />
      <FlowFullscreenModal
        open={fullscreen === "ia-first"}
        onOpenChange={(open) => setFullscreen(open ? "ia-first" : null)}
        nodes={toBe.nodes}
        edges={toBe.edges}
        title={`${processName} — IA-First`}
      />
    </div>
  );
}

function FlowPreview({
  nodes,
  edges,
  onExpand,
  accent,
}: {
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
  onExpand: () => void;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-72 overflow-hidden rounded-lg border",
        accent ? "border-brand/30" : "border-border",
      )}
    >
      <FlowDiagram nodes={nodes} edges={edges} />
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 bg-surface"
        onClick={onExpand}
      >
        <Maximize2 data-icon="inline-start" />
        Visualização ampla
      </Button>
    </div>
  );
}
