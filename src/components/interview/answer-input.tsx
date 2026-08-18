"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { useTransition } from "react";
import { improveAnswerText } from "@/app/actions/ai-assist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProcessQuestion } from "@/generated/prisma/client";
import type { Answer, Step } from "@/lib/interview/answers";

interface AnswerInputProps {
  question: ProcessQuestion;
  value: Answer;
  onChange: (value: Answer) => void;
  disabled?: boolean;
}

/**
 * Renderiza o controle adequado ao `inputKind` cadastrado na pergunta. Campos
 * de texto livre (text/longText) ganham o botão "Melhorar com IA" — o único
 * ponto onde a IA participa da entrevista, e só quando a pessoa pede.
 */
export function AnswerInput({ question, value, onChange, disabled }: AnswerInputProps) {
  switch (value.kind) {
    case "text":
      return (
        <TextWithAssist
          multiline={false}
          disabled={disabled}
          value={value.value}
          placeholder={question.placeholder}
          questionText={question.questionText}
          onChange={(next) => onChange({ kind: "text", value: next })}
        />
      );

    case "longText":
      return (
        <TextWithAssist
          multiline
          disabled={disabled}
          value={value.value}
          placeholder={question.placeholder}
          questionText={question.questionText}
          onChange={(next) => onChange({ kind: "longText", value: next })}
        />
      );

    case "number":
      return (
        <Input
          autoFocus
          disabled={disabled}
          type="number"
          min={0}
          step="any"
          value={value.value ?? ""}
          onChange={(event) =>
            onChange({
              kind: "number",
              value: event.target.value === "" ? null : Number(event.target.value),
            })
          }
          className="h-11 max-w-36 font-mono text-base"
        />
      );

    case "list":
      return (
        <RepeatingRows
          disabled={disabled}
          rows={value.value.length > 0 ? value.value : [""]}
          onChange={(rows) => onChange({ kind: "list", value: rows })}
          makeEmpty={() => ""}
          addLabel="Adicionar item"
          render={(row, update) => (
            <Input
              disabled={disabled}
              value={row}
              placeholder={question.placeholder ?? undefined}
              onChange={(event) => update(event.target.value)}
            />
          )}
        />
      );

    case "steps":
      return (
        <RepeatingRows
          disabled={disabled}
          rows={value.value}
          onChange={(rows) => onChange({ kind: "steps", value: rows })}
          makeEmpty={(): Step => ({ what: "", how: "", tool: "", role: "" })}
          addLabel="Adicionar passo"
          numbered
          render={(row, update) => (
            <div className="grid flex-1 gap-2">
              <Input
                disabled={disabled}
                value={row.what}
                placeholder="O que fazer"
                onChange={(event) => update({ ...row, what: event.target.value })}
              />
              <Textarea
                disabled={disabled}
                rows={2}
                value={row.how}
                placeholder="Como fazer, no detalhe"
                onChange={(event) => update({ ...row, how: event.target.value })}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  disabled={disabled}
                  value={row.tool}
                  placeholder="Ferramenta ou sistema"
                  onChange={(event) => update({ ...row, tool: event.target.value })}
                />
                <Input
                  disabled={disabled}
                  value={row.role}
                  placeholder="Cargo que executa"
                  onChange={(event) => update({ ...row, role: event.target.value })}
                />
              </div>
            </div>
          )}
        />
      );
  }
}

function TextWithAssist({
  multiline,
  value,
  placeholder,
  questionText,
  onChange,
  disabled,
}: {
  multiline: boolean;
  value: string;
  placeholder?: string | null;
  questionText: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleImprove() {
    if (!value.trim()) return;
    startTransition(async () => {
      const improved = await improveAnswerText(questionText, value);
      if (improved) onChange(improved);
    });
  }

  const Field = multiline ? Textarea : Input;

  return (
    <div className="space-y-2">
      <Field
        autoFocus
        disabled={disabled || pending}
        rows={multiline ? 5 : undefined}
        value={value}
        placeholder={placeholder ?? undefined}
        onChange={(event) => onChange(event.target.value)}
        className={multiline ? "text-base" : "h-11 text-base"}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || pending || !value.trim()}
        onClick={handleImprove}
        className="text-brand hover:text-brand"
      >
        <Sparkles data-icon="inline-start" className={pending ? "animate-pulse" : undefined} />
        {pending ? "Melhorando…" : "Melhorar com IA"}
      </Button>
    </div>
  );
}

interface RepeatingRowsProps<T> {
  rows: T[];
  onChange: (rows: T[]) => void;
  makeEmpty: () => T;
  render: (row: T, update: (next: T) => void) => React.ReactNode;
  addLabel: string;
  numbered?: boolean;
  max?: number;
  disabled?: boolean;
}

function RepeatingRows<T>({
  rows,
  onChange,
  makeEmpty,
  render,
  addLabel,
  numbered,
  max,
  disabled,
}: RepeatingRowsProps<T>) {
  const list = rows.length > 0 ? rows : [makeEmpty()];
  const atMax = max !== undefined && list.length >= max;

  return (
    <div className="space-y-3">
      {list.map((row, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: linhas de formulário ordenadas, sem identidade própria até serem gravadas — a posição é a identidade
          key={`row-${index}`}
          className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3"
        >
          {numbered ? (
            <span className="mt-2 w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">
              {index + 1}
            </span>
          ) : null}

          {render(row, (next) => {
            const copy = [...list];
            copy[index] = next;
            onChange(copy);
          })}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled || list.length === 1}
            aria-label="Remover linha"
            onClick={() => onChange(list.filter((_, position) => position !== index))}
          >
            <X />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || atMax}
        onClick={() => onChange([...list, makeEmpty()])}
      >
        <Plus data-icon="inline-start" />
        {addLabel}
      </Button>
    </div>
  );
}
