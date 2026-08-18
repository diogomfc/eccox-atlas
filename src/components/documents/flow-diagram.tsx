"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CheckCircle2,
  Flag,
  GitBranch,
  Hand,
  PlayCircle,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import type { FlowEdgeData, FlowNodeData } from "@/lib/documents/flow";
import { cn } from "@/lib/utils";

interface AtlasNodeData extends Record<string, unknown> {
  label: string;
  detail?: string;
  kind: FlowNodeData["type"];
}

const NODE_STYLE: Record<
  FlowNodeData["type"],
  { icon: typeof PlayCircle; label: string; className: string; iconClassName: string }
> = {
  GATILHO: {
    icon: PlayCircle,
    label: "Gatilho",
    className: "border-success/40 bg-success/10",
    iconClassName: "text-success",
  },
  MANUAL: {
    icon: Hand,
    label: "Manual",
    className: "border-warning/40 bg-warning/10",
    iconClassName: "text-warning",
  },
  INTEGRACAO: {
    icon: Workflow,
    label: "Integração",
    className: "border-info/40 bg-info/10",
    iconClassName: "text-info",
  },
  DECISAO: {
    icon: GitBranch,
    label: "Decisão",
    className: "border-destructive/40 bg-destructive/10",
    iconClassName: "text-destructive",
  },
  APROVACAO: {
    icon: CheckCircle2,
    label: "Aprovação",
    className: "border-[oklch(0.55_0.15_290/0.4)] bg-[oklch(0.55_0.15_290/0.1)]",
    iconClassName: "text-[oklch(0.55_0.15_290)]",
  },
  AUTOMACAO: {
    icon: Zap,
    label: "Automação",
    className: "border-brand/40 bg-brand-soft",
    iconClassName: "text-brand",
  },
  AGENTE_IA: {
    icon: Sparkles,
    label: "Agente de IA",
    className: "border-[oklch(0.55_0.15_290/0.4)] bg-[oklch(0.55_0.15_290/0.1)]",
    iconClassName: "text-[oklch(0.55_0.15_290)]",
  },
  FIM: {
    icon: Flag,
    label: "Fim",
    className: "border-border bg-muted",
    iconClassName: "text-muted-foreground",
  },
};

function AtlasNode({ data }: NodeProps<Node<AtlasNodeData>>) {
  const style = NODE_STYLE[data.kind];
  const Icon = style.icon;
  return (
    <div
      className={cn(
        "min-w-52 max-w-64 rounded-lg border px-3 py-2.5 text-xs shadow-sm backdrop-blur-sm",
        style.className,
      )}
    >
      <Handle type="target" position={Position.Left} className="bg-brand! border-none!" />
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={cn("size-3", style.iconClassName)} />
        <span className={cn("label-caps", style.iconClassName)}>{style.label}</span>
      </div>
      <p className="font-medium leading-4">{data.label}</p>
      {data.detail ? (
        <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{data.detail}</p>
      ) : null}
      <Handle type="source" position={Position.Right} className="bg-brand! border-none!" />
    </div>
  );
}

const NODE_TYPES = { atlas: AtlasNode };

interface FlowDiagramProps {
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
  interactive?: boolean;
  className?: string;
}

/** Renderização somente-leitura do fluxo (seção 5) — layout já vem calculado
 * por dagre em src/lib/documents/flow.ts, aqui só desenha. Arestas animadas
 * (fluxo "correndo" na linha), layout horizontal. */
export function FlowDiagram({ nodes, edges, interactive = false, className }: FlowDiagramProps) {
  const flowNodes = useMemo<Node<AtlasNodeData>[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: "atlas",
        position: { x: node.x, y: node.y },
        data: { label: node.label, detail: node.detail, kind: node.type },
        draggable: false,
        selectable: false,
      })),
    [nodes],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: true,
        label: edge.label,
        labelStyle: { fill: "var(--foreground)", fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "var(--surface)" },
        style: { stroke: "var(--brand)", strokeWidth: 1.5 },
      })),
    [edges],
  );

  return (
    <div className={cn("h-full w-full", className)}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={interactive}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        zoomOnDoubleClick={interactive}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--border)" />
        {interactive ? <Controls showInteractive={false} /> : null}
      </ReactFlow>
    </div>
  );
}
