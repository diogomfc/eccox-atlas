import dagre from "dagre";
import type { FlowNodeType } from "@/generated/prisma/client";
import type { Step } from "@/lib/interview/answers";

/**
 * Seção 5 do modelo oficial — desenho do processo. Cada Passo vira um nó em
 * sequência, layout Dagre horizontal (esquerda→direita). O Gatilho (se
 * houver) abre o fluxo; um nó Fim fecha.
 */

export interface FlowNodeData {
  id: string;
  type: FlowNodeType;
  label: string;
  detail?: string;
  x: number;
  y: number;
}

export interface FlowEdgeData {
  id: string;
  source: string;
  target: string;
  /** Rótulo da aresta — usado em ramificações de decisão ("Sim"/"Não"). */
  label?: string;
}

export interface FlowGraphData {
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
}

const NODE_WIDTH = 240;
const NODE_HEIGHT = 76;

interface RawNode {
  id: string;
  type: FlowNodeType;
  label: string;
  detail?: string;
}

interface RawEdge {
  source: string;
  target: string;
  label?: string;
}

/** Layout Dagre compartilhado — sem IA (AS_IS) e sugestão de IA (TO_BE) usam
 * o mesmo desenho horizontal, só a montagem dos nós muda. */
function layoutFlow(nodes: RawNode[], edges: RawEdge[]): FlowGraphData {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 90 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return {
    nodes: nodes.map((node) => {
      const position = graph.node(node.id);
      return { ...node, x: position.x, y: position.y };
    }),
    edges: edges.map((edge) => ({
      id: `${edge.source}->${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    })),
  };
}

export function buildFlowFromSteps(gatilho: string | null, steps: Step[]): FlowGraphData | null {
  if (steps.length === 0) return null;

  const nodes: RawNode[] = [];
  if (gatilho) nodes.push({ id: "gatilho", type: "GATILHO", label: gatilho });

  steps.forEach((step, index) => {
    nodes.push({
      id: `passo-${index + 1}`,
      type: "MANUAL",
      label: step.what,
      detail: [step.tool, step.role].filter(Boolean).join(" · ") || undefined,
    });
  });

  nodes.push({ id: "fim", type: "FIM", label: "Fim" });

  const edges: RawEdge[] = nodes.slice(0, -1).map((node, index) => ({
    source: node.id,
    target: nodes[index + 1].id,
  }));

  return layoutFlow(nodes, edges);
}

export interface AiFlowStep {
  type: FlowNodeType;
  label: string;
  detail?: string;
}

/** Monta o fluxo sugerido pela IA (TO_BE) — mesma sequência linear do AS_IS,
 * mas com tipos de nó mais ricos (integração, automação, agente de IA,
 * aprovação). Sem ramificação por ora: ver rationale para o "porquê". */
export function buildFlowFromAiSteps(
  gatilho: string | null,
  steps: AiFlowStep[],
): FlowGraphData | null {
  if (steps.length === 0) return null;

  const nodes: RawNode[] = [];
  if (gatilho) nodes.push({ id: "gatilho", type: "GATILHO", label: gatilho });

  steps.forEach((step, index) => {
    nodes.push({
      id: `passo-${index + 1}`,
      type: step.type,
      label: step.label,
      detail: step.detail,
    });
  });

  nodes.push({ id: "fim", type: "FIM", label: "Fim" });

  const edges: RawEdge[] = nodes.slice(0, -1).map((node, index) => ({
    source: node.id,
    target: nodes[index + 1].id,
  }));

  return layoutFlow(nodes, edges);
}
