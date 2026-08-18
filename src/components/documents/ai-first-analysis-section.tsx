"use client";

import {
  Bot,
  Loader2,
  Maximize2,
  Server,
  Sparkles,
  Target,
  TrendingDown,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlowDiagram } from "@/components/documents/flow-diagram";
import { FlowFullscreenModal } from "@/components/documents/flow-fullscreen-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiFlowActor } from "@/lib/ai/gateway";
import type { AiFirstAnalysisData } from "@/lib/documents/ai-first-analysis";
import type { FlowEdgeData, FlowNodeData } from "@/lib/documents/flow";
import { cn } from "@/lib/utils";

interface FlowSet {
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
}

interface AiFirstAnalysisSectionProps {
  processName: string;
  asIs: FlowSet;
  toBe: (FlowSet & { analysis: AiFirstAnalysisData }) | null;
  /** Gestor + processo aprovado — só nesse caso a ação de gerar aparece. */
  canGenerate: boolean;
  onGenerate?: () => Promise<{ ok: boolean; error?: string }>;
}

const HOURS_FORMAT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const BRL_FORMAT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const PCT_FORMAT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function AiFirstAnalysisSection({
  processName,
  asIs,
  toBe,
  canGenerate,
  onGenerate,
}: AiFirstAnalysisSectionProps) {
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

  const generateButton = canGenerate ? (
    <Button
      size="sm"
      variant={toBe ? "ghost" : "outline"}
      onClick={handleGenerate}
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles data-icon="inline-start" />}
      {toBe ? "Gerar de novo" : "Gerar sugestão IA-First"}
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      {!toBe ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4">
          <Sparkles className="size-5 shrink-0 text-brand" />
          <p className="flex-1 text-sm text-muted-foreground">
            Peça pra IA sugerir uma versão deste fluxo com menos passos manuais — automação e
            agentes de IA sobre as mesmas ferramentas de hoje, com estimativa de economia, matriz de
            papéis e plano de implementação por ondas.
          </p>
          {generateButton}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft p-4">
            <div className="flex items-start gap-2.5">
              <Target className="mt-0.5 size-4 shrink-0 text-brand" />
              <div>
                <p className="label-caps text-brand">Resultado-alvo</p>
                <p className="text-sm">{toBe.analysis.targetOutcome}</p>
              </div>
            </div>
            {generateButton}
          </div>

          <RoiCard roi={toBe.analysis.roi} />
        </>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <section className="space-y-4">
        <h2 className="label-caps">Antes × Depois</h2>
        <div className="space-y-2">
          <p className="text-sm font-medium">Hoje</p>
          <FlowPreview
            nodes={asIs.nodes}
            edges={asIs.edges}
            onExpand={() => setFullscreen("hoje")}
          />
        </div>
        {toBe ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand">
              <Sparkles className="size-3.5" />
              IA-First
            </p>
            <FlowPreview
              nodes={toBe.nodes}
              edges={toBe.edges}
              onExpand={() => setFullscreen("ia-first")}
              accent
            />
          </div>
        ) : null}
      </section>

      {toBe ? (
        <>
          <WhatDiesCard items={toBe.analysis.whatDies} />
          <RoleMatrixCard rows={toBe.analysis.roleMatrix} />
          <LearningLoopCard items={toBe.analysis.learningLoop} />
          <WavePlanCard waves={toBe.analysis.wavePlan} />
        </>
      ) : null}

      <FlowFullscreenModal
        open={fullscreen === "hoje"}
        onOpenChange={(open) => setFullscreen(open ? "hoje" : null)}
        nodes={asIs.nodes}
        edges={asIs.edges}
        title={processName}
      />
      {toBe ? (
        <FlowFullscreenModal
          open={fullscreen === "ia-first"}
          onOpenChange={(open) => setFullscreen(open ? "ia-first" : null)}
          nodes={toBe.nodes}
          edges={toBe.edges}
          title={`${processName} — IA-First`}
        />
      ) : null}
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

function RoiCard({ roi }: { roi: AiFirstAnalysisData["roi"] }) {
  return (
    <div className="surface-panel space-y-4 p-5">
      <div className="flex items-center gap-2">
        <TrendingDown className="size-4 text-success" />
        <h2 className="font-semibold tracking-tight">Economia estimada</h2>
      </div>

      <div>
        <p className="font-mono text-[2rem] leading-10 tracking-tight">
          {HOURS_FORMAT.format(roi.hoursSavedPerMonth)} <span className="text-lg">h/mês</span>
        </p>
        <p className="text-sm text-muted-foreground">
          ≈ {BRL_FORMAT.format(roi.costPerMonthTodayBRL - roi.costPerMonthAiFirstBRL)}/mês ·{" "}
          {BRL_FORMAT.format(roi.yearlySavingsBRL)}/ano
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-96 text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-1.5 font-normal" />
              <th className="pb-1.5 font-normal">Hoje</th>
              <th className="pb-1.5 font-normal text-brand">IA-First</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <Row
              label="Horas/mês"
              today={`${HOURS_FORMAT.format(roi.hoursPerMonthToday)} h`}
              ideal={`${HOURS_FORMAT.format(roi.hoursPerMonthAiFirst)} h`}
            />
            <Row
              label="Custo/mês"
              today={BRL_FORMAT.format(roi.costPerMonthTodayBRL)}
              ideal={BRL_FORMAT.format(roi.costPerMonthAiFirstBRL)}
            />
            <Row
              label="Redução de horas"
              today="—"
              ideal={`${PCT_FORMAT.format(roi.hourReductionPct)}%`}
            />
            <Row
              label="Redução de ciclo"
              today="—"
              ideal={`${PCT_FORMAT.format(roi.cycleReductionPct)}%`}
            />
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="label-caps mb-2">Premissas (da entrevista)</p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <PremiseItem label="Execuções/mês" value={HOURS_FORMAT.format(roi.executionsPerMonth)} />
          <PremiseItem label="Horas/execução" value={String(roi.hoursPerExecutionToday)} />
          <PremiseItem label="Pessoas envolvidas" value={String(roi.peopleInvolved)} />
          <PremiseItem label="Custo/hora (R$)" value={String(roi.costPerHourBRL)} />
        </dl>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">Como chegamos nesse número</p>
        <p className="mt-1 text-sm leading-6">{roi.reasoning}</p>
      </div>

      <p className="text-xs text-muted-foreground italic">
        O número final é calculado em código a partir das premissas — a IA só estima o percentual de
        redução. Ajuste as premissas pra refletir a sua realidade.
      </p>
    </div>
  );
}

function Row({ label, today, ideal }: { label: string; today: string; ideal: string }) {
  return (
    <tr>
      <td className="py-1.5 text-muted-foreground">{label}</td>
      <td className="py-1.5">{today}</td>
      <td className="py-1.5 font-medium text-brand">{ideal}</td>
    </tr>
  );
}

function PremiseItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium">{value}</dd>
    </div>
  );
}

function WhatDiesCard({ items }: { items: AiFirstAnalysisData["whatDies"] }) {
  return (
    <section className="space-y-3">
      <h2 className="label-caps">O que morre no redesenho</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="rounded-lg border border-destructive/25 bg-destructive/5 p-3"
          >
            <p className="text-sm font-medium text-destructive">{item.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ACTOR_STYLE: Record<AiFlowActor, { icon: typeof User; label: string; className: string }> = {
  HUMANO: { icon: User, label: "Humano", className: "bg-warning/15 text-warning" },
  SISTEMA: { icon: Server, label: "Sistema", className: "bg-info/15 text-info" },
  IA: {
    icon: Bot,
    label: "IA",
    className: "bg-[oklch(0.55_0.15_290/0.15)] text-[oklch(0.55_0.15_290)]",
  },
};

function ActorBadge({ actor }: { actor: AiFlowActor }) {
  const style = ACTOR_STYLE[actor];
  const Icon = style.icon;
  return (
    <Badge className={style.className}>
      <Icon className="size-3" />
      {style.label}
    </Badge>
  );
}

function RoleMatrixCard({ rows }: { rows: AiFirstAnalysisData["roleMatrix"] }) {
  return (
    <section className="space-y-3">
      <h2 className="label-caps">Matriz de papéis — quem faz o quê</h2>
      <div className="surface-panel overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-normal">Passo</th>
              <th className="p-3 font-normal">Hoje</th>
              <th className="p-3 font-normal">Ideal</th>
              <th className="p-3 font-normal">Por quê</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.step}>
                <td className="p-3 font-medium">{row.step}</td>
                <td className="p-3">
                  <ActorBadge actor={row.today} />
                </td>
                <td className="p-3">
                  <ActorBadge actor={row.ideal} />
                </td>
                <td className="p-3 text-muted-foreground">{row.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LearningLoopCard({ items }: { items: AiFirstAnalysisData["learningLoop"] }) {
  return (
    <section className="space-y-3">
      <h2 className="label-caps">Loop de aprendizado</h2>
      <p className="text-xs text-muted-foreground">
        O fluxo não termina — ele aprende: executa → mede → aprende → redesenha.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.metric} className="surface-panel p-4">
            <p className="text-sm font-medium">{item.metric}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const WAVE_ACTION_LABEL: Record<string, string> = {
  AGENTE: "Agente",
  SISTEMA: "Sistema",
  INTEGRACAO: "Integração",
};

function WavePlanCard({ waves }: { waves: AiFirstAnalysisData["wavePlan"] }) {
  return (
    <section className="space-y-3">
      <h2 className="label-caps">Plano de ondas — a virada em etapas</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {waves.map((wave) => (
          <div key={wave.wave} className="surface-panel space-y-2 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft font-mono text-xs text-brand">
                {wave.wave}
              </span>
              <p className="text-sm font-medium">{wave.title}</p>
            </div>
            <p className="text-xs text-muted-foreground">{wave.description}</p>
            <ul className="space-y-1.5">
              {wave.actions.map((action) => (
                <li
                  key={`${action.type}-${action.description}`}
                  className="flex items-start gap-1.5 text-xs"
                >
                  <Badge variant="outline" className="shrink-0">
                    {WAVE_ACTION_LABEL[action.type] ?? action.type}
                  </Badge>
                  <span className="text-muted-foreground">{action.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
