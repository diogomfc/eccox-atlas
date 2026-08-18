import { FlowComparisonSection } from "@/components/documents/flow-comparison-section";
import type { FlowEdgeData, FlowNodeData } from "@/lib/documents/flow";
import type { DocumentSections } from "@/lib/documents/sections";
import { CLASSIFICATION_LABEL } from "@/lib/domain";

type FlowSet = { nodes: FlowNodeData[]; edges: FlowEdgeData[] };

interface DocumentReaderProps {
  processName: string;
  processCode: string;
  areaName: string;
  version: number;
  classification: "INTERNA_GERAL" | "INTERNA_EXCLUSIVA_AREA" | "PUBLICA";
  elaboradoPor: string;
  dataElaboracao: Date;
  aprovadoPor: string | null;
  dataAprovacao: Date | null;
  publicadoEm: string;
  sections: DocumentSections;
  flow: FlowSet | null;
  flowToBe?: (FlowSet & { rationale: string | null }) | null;
  canGenerateFlow?: boolean;
  onGenerateFlow?: () => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Leitura fiel ao cabeçalho fixo e às seções do modelo oficial POP V3. Usado
 * na revisão do gestor, na página do processo e na impressão (§7 do plano).
 */
export function DocumentReader(props: DocumentReaderProps) {
  return (
    <article className="container-read space-y-8 py-10 print:py-0">
      <header className="space-y-4">
        <p className="label-caps">Procedimento Operacional Padrão</p>
        <h1 className="text-[1.75rem] leading-9 font-semibold tracking-tight">
          {props.processName}
        </h1>

        <dl className="surface-panel grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm print:border-none print:bg-transparent print:p-0 sm:grid-cols-3">
          <Field label="Código" value={props.processCode} mono />
          <Field label="Área" value={props.areaName} />
          <Field label="Versão" value={`v${props.version}`} mono />
          <Field label="Classificação" value={CLASSIFICATION_LABEL[props.classification]} />
          <Field label="Elaborado por" value={props.elaboradoPor} />
          <Field label="Data de elaboração" value={formatDate(props.dataElaboracao)} />
          <Field label="Aprovado por" value={props.aprovadoPor ?? "—"} />
          <Field
            label="Data de aprovação"
            value={props.dataAprovacao ? formatDate(props.dataAprovacao) : "—"}
          />
          <Field label="Publicado em" value={props.publicadoEm} />
        </dl>
      </header>

      {props.sections.map((group, index) => (
        <section key={group.sectionId} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {index + 1}. {group.label}
          </h2>
          {group.items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Não preenchido.</p>
          ) : (
            group.items.map((item) => (
              <div key={item.questionText} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{item.questionText}</p>
                <p className="text-sm leading-6 whitespace-pre-wrap">{item.text}</p>
              </div>
            ))
          )}
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {props.sections.length + 1}. Desenho do Processo
        </h2>
        {props.flow ? (
          <FlowComparisonSection
            processName={props.processName}
            asIs={props.flow}
            toBe={props.flowToBe ?? null}
            canGenerate={Boolean(props.canGenerateFlow)}
            onGenerate={props.onGenerateFlow}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Sem passos suficientes na entrevista para gerar o desenho do processo.
          </p>
        )}
      </section>
    </article>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className={mono ? "font-mono text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}
