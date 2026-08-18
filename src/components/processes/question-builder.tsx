"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import {
  addQuestion,
  addSection,
  deleteQuestion,
  deleteSection,
  moveQuestion,
  updateQuestion,
  updateSection,
} from "@/app/actions/processes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ProcessQuestion, QuestionInputKind } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const INPUT_KIND_LABEL: Record<QuestionInputKind, string> = {
  TEXT: "Texto curto",
  LONG_TEXT: "Texto longo",
  NUMBER: "Número",
  LIST: "Lista",
  STEPS: "Passos (com ferramenta e cargo)",
};

interface SectionWithQuestions {
  id: string;
  label: string;
  order: number;
  questions: ProcessQuestion[];
}

interface QuestionBuilderProps {
  processId: string;
  sections: SectionWithQuestions[];
}

/**
 * Roteiro do processo, por grupo. O gestor pode criar/renomear/excluir
 * grupos livremente, além de criar/editar/reordenar/excluir perguntas
 * dentro de cada grupo — o roteiro padrão (Objetivo/Responsável/Ferramentas/
 * Passos) é só o ponto de partida, não uma estrutura fixa.
 */
export function QuestionBuilder({ processId, sections }: QuestionBuilderProps) {
  const [addingSection, setAddingSection] = useState(false);
  const hasFlowSource = sections.some((section) =>
    section.questions.some((question) => question.isFlowSource),
  );

  return (
    <div className="space-y-4">
      {!hasFlowSource ? (
        <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">
          <Lightbulb className="mt-0.5 size-4 shrink-0" />
          <p>
            Nenhuma pergunta marcada como fonte do fluxo — pra gerar o desenho automático,
            marque uma pergunta tipo Lista ou Passos com "Usar pra desenhar o fluxo" (o ideal é uma
            sobre etapas e ferramentas do processo).
          </p>
        </div>
      ) : null}

      {sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <SectionPanel key={section.id} processId={processId} section={section} />
        ))}

      {addingSection ? (
        <NewSectionForm processId={processId} onDone={() => setAddingSection(false)} />
      ) : (
        <Button variant="outline" onClick={() => setAddingSection(true)}>
          <Plus data-icon="inline-start" />
          Novo grupo
        </Button>
      )}
    </div>
  );
}

function NewSectionForm({ processId, onDone }: { processId: string; onDone: () => void }) {
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!label.trim()) return;
    startTransition(async () => {
      await addSection({ processId, label });
      onDone();
    });
  }

  return (
    <div className="surface-panel flex items-center gap-2 p-4">
      <Input
        autoFocus
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Nome do grupo, ex: Exceções"
        onKeyDown={(event) => event.key === "Enter" && handleSave()}
        className="max-w-xs"
      />
      <Button size="sm" disabled={pending || !label.trim()} onClick={handleSave}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Criar
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone} disabled={pending}>
        Cancelar
      </Button>
    </div>
  );
}

function SectionPanel({
  processId,
  section,
}: {
  processId: string;
  section: SectionWithQuestions;
}) {
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const questions = section.questions.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="surface-panel p-5">
      <div className="flex items-center justify-between gap-2">
        {renaming ? (
          <SectionLabelForm
            processId={processId}
            section={section}
            onDone={() => setRenaming(false)}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold tracking-tight">{section.label}</h2>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Renomear grupo"
              onClick={() => setRenaming(true)}
            >
              <Pencil />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setAdding(true)} disabled={adding}>
            <Plus data-icon="inline-start" />
            Pergunta
          </Button>
          <DeleteSectionButton processId={processId} sectionId={section.id} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {questions.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">Nenhuma pergunta cadastrada neste grupo.</p>
        ) : null}

        {questions.map((question, index) => (
          <QuestionRow
            key={question.id}
            processId={processId}
            question={question}
            isFirst={index === 0}
            isLast={index === questions.length - 1}
          />
        ))}

        {adding ? (
          <QuestionForm
            processId={processId}
            sectionId={section.id}
            onDone={() => setAdding(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

function SectionLabelForm({
  processId,
  section,
  onDone,
}: {
  processId: string;
  section: SectionWithQuestions;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(section.label);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!label.trim()) return;
    startTransition(async () => {
      await updateSection({ id: section.id, processId, label });
      onDone();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && handleSave()}
        className="h-8 w-48"
      />
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Salvar nome do grupo"
        disabled={pending || !label.trim()}
        onClick={handleSave}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Check />}
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Cancelar"
        onClick={onDone}
        disabled={pending}
      >
        <X />
      </Button>
    </div>
  );
}

function DeleteSectionButton({ processId, sectionId }: { processId: string; sectionId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    startTransition(async () => {
      const result = await deleteSection(sectionId, processId);
      if (!result.ok) {
        setError(result.error ?? "Não foi possível excluir.");
        setConfirming(false);
        return;
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Excluir grupo e perguntas?</span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-destructive hover:text-destructive"
          onClick={remove}
          disabled={pending}
          aria-label="Confirmar exclusão do grupo"
        >
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setConfirming(false)}
          disabled={pending}
          aria-label="Cancelar exclusão"
        >
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setConfirming(true)}
        aria-label="Excluir grupo"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function QuestionRow({
  processId,
  question,
  isFirst,
  isLast,
}: {
  processId: string;
  question: ProcessQuestion;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await moveQuestion(question.id, processId, direction);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteQuestion(question.id, processId);
      if (!result.ok) setError(result.error ?? "Não foi possível excluir.");
    });
  }

  if (editing) {
    return (
      <QuestionForm
        processId={processId}
        sectionId={question.sectionId}
        question={question}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-col gap-0.5 pt-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isFirst || pending}
            onClick={() => move("up")}
            aria-label="Mover para cima"
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isLast || pending}
            onClick={() => move("down")}
            aria-label="Mover para baixo"
          >
            <ChevronDown />
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn("min-w-0 flex-1 text-left")}
        >
          <p className="text-sm font-medium">{question.questionText}</p>
          {question.helperText ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{question.helperText}</p>
          ) : null}
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">
            {INPUT_KIND_LABEL[question.inputKind]}
            {question.required ? " · obrigatória" : " · opcional"}
            {question.allowEvidence ? " · aceita evidências" : ""}
            {question.isFlowSource ? " · fonte do fluxo" : ""}
          </p>
        </button>

        {pending ? (
          <Loader2 className="mt-1 size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={remove}
            aria-label="Remover pergunta"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function QuestionForm({
  processId,
  sectionId,
  question,
  onDone,
}: {
  processId: string;
  sectionId: string;
  question?: ProcessQuestion;
  onDone: () => void;
}) {
  const [questionText, setQuestionText] = useState(question?.questionText ?? "");
  const [helperText, setHelperText] = useState(question?.helperText ?? "");
  const [placeholder, setPlaceholder] = useState(question?.placeholder ?? "");
  const [inputKind, setInputKind] = useState<QuestionInputKind>(question?.inputKind ?? "TEXT");
  const [required, setRequired] = useState(question?.required ?? true);
  const [allowEvidence, setAllowEvidence] = useState(question?.allowEvidence ?? false);
  const [isFlowSource, setIsFlowSource] = useState(question?.isFlowSource ?? false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const inputItems = INPUT_KIND_LABEL;
  const supportsFlowSource = inputKind === "LIST" || inputKind === "STEPS";

  function handleSave() {
    if (!questionText.trim()) return;
    const effectiveFlowSource = supportsFlowSource && isFlowSource;
    startTransition(async () => {
      const result = question
        ? await updateQuestion({
            id: question.id,
            processId,
            sectionId,
            questionText,
            helperText,
            placeholder,
            inputKind,
            required,
            allowEvidence,
            isFlowSource: effectiveFlowSource,
          })
        : await addQuestion({
            processId,
            sectionId,
            questionText,
            helperText,
            placeholder,
            inputKind,
            required,
            allowEvidence,
            isFlowSource: effectiveFlowSource,
          });
      if (!result.ok) {
        setError(result.error ?? "Não foi possível salvar.");
        return;
      }
      onDone();
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-ring bg-surface p-3">
      <Input
        autoFocus
        value={questionText}
        onChange={(event) => setQuestionText(event.target.value)}
        placeholder="Texto da pergunta"
      />
      <Textarea
        rows={2}
        value={helperText}
        onChange={(event) => setHelperText(event.target.value)}
        placeholder="Texto de ajuda (opcional)"
      />
      <Input
        value={placeholder}
        onChange={(event) => setPlaceholder(event.target.value)}
        placeholder="Placeholder (opcional)"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select
          items={inputItems}
          value={inputKind}
          onValueChange={(next) => setInputKind(next as QuestionInputKind)}
        >
          <SelectTrigger size="sm" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(INPUT_KIND_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            className="size-3.5 rounded border-input"
          />
          Obrigatória
        </label>

        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={allowEvidence}
            onChange={(event) => setAllowEvidence(event.target.checked)}
            className="size-3.5 rounded border-input"
          />
          Permitir anexo de evidências nesta pergunta
        </label>

        {supportsFlowSource ? (
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={isFlowSource}
              onChange={(event) => setIsFlowSource(event.target.checked)}
              className="size-3.5 rounded border-input"
            />
            Usar pra desenhar o fluxo do processo
          </label>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button size="sm" disabled={pending || !questionText.trim()} onClick={handleSave}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
