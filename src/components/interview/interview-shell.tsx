"use client";

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Save,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { submitAnswer, submitInterviewForReview } from "@/app/actions/interview";
import { AnswerInput } from "@/components/interview/answer-input";
import { FichaPanel } from "@/components/interview/ficha-panel";
import { QuestionAttachmentDropzone } from "@/components/interview/question-attachment-dropzone";
import { Button } from "@/components/ui/button";
import { type Answer, isAnswerEmpty, sectionProgress } from "@/lib/interview/answers";
import { type QuestionWithSection, sortQuestions } from "@/lib/interview/engine";
import type { InterviewState } from "@/lib/queries/interview";
import { cn } from "@/lib/utils";

const TRANSITION = { type: "spring", stiffness: 300, damping: 30 } as const;

export function InterviewShell({ state }: { state: InterviewState }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(state.answersByQuestionId);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(
    () => new Set(state.visitedQuestionIds),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [browsingId, setBrowsingId] = useState<string | null>(null);

  const questions = sortQuestions(state.questions);
  const progress = sectionProgress(questions, answers, visitedIds);
  const allAnswered = progress.every((section) => section.answered === section.total);

  function handleSaved(questionId: string, value: Answer) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setVisitedIds((prev) => new Set(prev).add(questionId));
    setEditingId(null);
  }

  const canEdit = state.interviewStatus !== "ENVIADA" && state.interviewStatus !== "APROVADA";

  const prompt = state.prompt;

  if (editingId) {
    const question = questions.find((item) => item.id === editingId);
    if (question) {
      return (
        <div className="container-page grid gap-8 pt-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-8">
            <SectionTabs progress={progress} activeSection={question.sectionId} />
            <QuestionCard
              key={question.id}
              token={state.token}
              question={question}
              initialValue={answers[question.id]}
              onSaved={(value) => handleSaved(question.id, value)}
              compact
              onCancel={() => setEditingId(null)}
              processId={state.process.id}
              interviewId={state.interviewId}
              attachments={state.attachmentsByQuestionId[question.id] ?? []}
            />
          </div>
          <ProgressAside progress={progress} canEdit={canEdit} />
        </div>
      );
    }
  }

  if (prompt.kind === "question") {
    const activeQuestion = browsingId
      ? (questions.find((item) => item.id === browsingId) ?? prompt.question)
      : prompt.question;
    const activeIndex = questions.findIndex((item) => item.id === activeQuestion.id);
    const isBrowsing = activeQuestion.id !== prompt.question.id;

    return (
      <div className="container-page grid gap-8 pt-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <SectionTabs progress={progress} activeSection={activeQuestion.sectionId} />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Pergunta anterior"
              disabled={activeIndex <= 0}
              onClick={() => setBrowsingId(questions[activeIndex - 1].id)}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Próxima pergunta"
              disabled={!isBrowsing || activeIndex >= prompt.index}
              onClick={() => {
                const next = questions[activeIndex + 1];
                setBrowsingId(next.id === prompt.question.id ? null : next.id);
              }}
            >
              <ChevronRight />
            </Button>
            <span className="text-xs text-muted-foreground">
              Pergunta {activeIndex + 1} de {questions.length}
            </span>
            {isBrowsing ? (
              <button
                type="button"
                onClick={() => setBrowsingId(null)}
                className="ml-auto text-xs font-medium text-brand hover:underline"
              >
                Voltar ao ponto atual
              </button>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            <QuestionCard
              key={activeQuestion.id}
              token={state.token}
              question={activeQuestion}
              initialValue={answers[activeQuestion.id]}
              onSaved={(value) => {
                handleSaved(activeQuestion.id, value);
                if (isBrowsing) setBrowsingId(null);
              }}
              processId={state.process.id}
              interviewId={state.interviewId}
              attachments={state.attachmentsByQuestionId[activeQuestion.id] ?? []}
            />
          </AnimatePresence>
        </div>
        <ProgressAside progress={progress} canEdit={canEdit} />
      </div>
    );
  }

  return (
    <div className="container-page grid gap-8 pt-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-8">
        <SectionTabs progress={progress} />

        <ReviewScreen
          state={state}
          questions={questions}
          answers={answers}
          canEdit={canEdit}
          allAnswered={allAnswered}
          onEdit={setEditingId}
        />
      </div>
      <ProgressAside progress={progress} canEdit={canEdit} />
    </div>
  );
}

function ProgressAside({
  progress,
  canEdit,
}: {
  progress: ReturnType<typeof sectionProgress>;
  canEdit: boolean;
}) {
  return <FichaPanel sections={progress} footer={canEdit ? <SaveAndExitButton /> : null} />;
}

function SectionTabs({
  progress,
  activeSection,
}: {
  progress: ReturnType<typeof sectionProgress>;
  activeSection?: string;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {progress.map((section) => {
        const done = section.total > 0 && section.answered === section.total;
        const active = section.sectionId === activeSection;
        return (
          <li key={section.sectionId}>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                active && "border-ring bg-brand-soft text-foreground",
                !active && done && "border-border text-muted-foreground",
                !active && !done && "border-border text-muted-foreground/60",
              )}
            >
              {section.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Cada resposta já grava por campo (submitAnswer) — este botão não introduz
 * persistência nova, só dá a affordance explícita de sair sabendo que nada
 * se perde, com uma confirmação visual antes de navegar.
 */
function SaveAndExitButton() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => router.push("/minhas-entrevistas"), 500);
    return () => clearTimeout(timeout);
  }, [saved, router]);

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
        <Check className="size-3.5" />
        Rascunho salvo
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setSaved(true)}
      className="inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
    >
      <Save className="size-3.5 shrink-0" />
      Salvar e continuar depois
    </button>
  );
}

function QuestionCard({
  token,
  question,
  initialValue,
  onSaved,
  compact,
  onCancel,
  processId,
  interviewId,
  attachments,
}: {
  token: string;
  question: QuestionWithSection;
  initialValue: Answer;
  onSaved: (value: Answer) => void;
  compact?: boolean;
  onCancel?: () => void;
  processId?: string;
  interviewId?: string | null;
  attachments?: Array<{ id: string; fileName: string; fileSize: number; mimeType: string }>;
}) {
  const [answer, setAnswer] = useState<Answer>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSubmit = !question.required || !isAnswerEmpty(answer);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitAnswer({ token, questionId: question.id, answer });
      if (!result.ok) {
        setError(result.error ?? null);
        return;
      }
      onSaved(answer);
    });
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={TRANSITION}
      className={cn("space-y-5", compact && "surface-panel p-5")}
    >
      <div className="space-y-2">
        {compact ? <p className="label-caps">{question.section.label}</p> : null}
        <h1
          className={cn(
            "font-semibold tracking-tight text-balance",
            compact ? "text-lg leading-6" : "text-[1.5rem] leading-8",
          )}
        >
          {question.questionText}
        </h1>
        {question.helperText ? (
          <p className="text-sm text-muted-foreground">{question.helperText}</p>
        ) : null}
      </div>

      <AnswerInput question={question} value={answer} onChange={setAnswer} disabled={pending} />

      {question.allowEvidence && processId && interviewId ? (
        <QuestionAttachmentDropzone
          processId={processId}
          questionId={question.id}
          interviewId={interviewId}
          attachments={attachments ?? []}
        />
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          size={compact ? "default" : "lg"}
          disabled={!canSubmit || pending}
          onClick={handleSubmit}
        >
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending ? "Salvando" : compact ? "Salvar" : "Continuar"}
          {!pending && !compact ? <ArrowRight data-icon="inline-end" /> : null}
        </Button>
        {compact && onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        ) : null}
        {!question.required && isAnswerEmpty(answer) ? (
          <span className="text-xs text-muted-foreground">
            Pode seguir em branco se não se aplica.
          </span>
        ) : null}
      </div>
    </motion.section>
  );
}

function ReviewScreen({
  state,
  questions,
  answers,
  canEdit,
  allAnswered,
  onEdit,
}: {
  state: InterviewState;
  questions: QuestionWithSection[];
  answers: Record<string, Answer>;
  canEdit: boolean;
  allAnswered: boolean;
  onEdit: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(state.interviewStatus === "ENVIADA");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitInterviewForReview(state.token);
      if (!result.ok) {
        setError(result.error ?? null);
        return;
      }
      setSent(true);
    });
  }

  return (
    <div className="space-y-6">
      <StatusBanner state={state} justSent={sent} />

      {state.reviewComment ? (
        <div className="surface-panel border-warning/40 bg-warning/5 p-4">
          <p className="label-caps text-warning">Revisão solicitada pelo gestor</p>
          <p className="mt-1 text-sm">{state.reviewComment}</p>
        </div>
      ) : null}

      <section className="surface-panel divide-y divide-border">
        {questions.map((question) => {
          const answer = answers[question.id];
          return (
            <div key={question.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="label-caps">{question.section.label}</p>
                <p className="text-sm font-medium">{question.questionText}</p>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {answer && !isAnswerEmpty(answer) ? summarize(answer) : "Não respondido."}
                </p>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Editar resposta"
                  onClick={() => onEdit(question.id)}
                >
                  <Pencil />
                </Button>
              ) : null}
            </div>
          );
        })}
      </section>

      {canEdit && !sent ? (
        <div className="space-y-2">
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button size="lg" disabled={!allAnswered || pending} onClick={handleSubmit}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? "Enviando" : "Enviar para aprovação"}
          </Button>
          {!allAnswered ? (
            <p className="text-xs text-muted-foreground">
              Ainda há perguntas obrigatórias sem resposta.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatusBanner({ state, justSent }: { state: InterviewState; justSent: boolean }) {
  if (justSent || state.interviewStatus === "ENVIADA") {
    return (
      <div className="surface-panel flex items-start gap-3 p-4">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
        <div>
          <p className="font-medium">Enviado para aprovação</p>
          <p className="text-sm text-muted-foreground">
            A equipe de governança vai revisar {state.process.code} — {state.process.name} e volta
            aqui se precisar de algum ajuste.
          </p>
        </div>
      </div>
    );
  }

  if (state.interviewStatus === "APROVADA") {
    return (
      <div className="surface-panel flex items-start gap-3 p-4">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
        <div>
          <p className="font-medium">Aprovado</p>
          <p className="text-sm text-muted-foreground">
            O processo {state.process.code} já foi aprovado a partir destas respostas.
          </p>
        </div>
      </div>
    );
  }

  if (state.interviewStatus === "EM_REVISAO") {
    return (
      <div className="surface-panel flex items-start gap-3 p-4">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
        <div>
          <p className="font-medium">Ajuste solicitado</p>
          <p className="text-sm text-muted-foreground">Reveja o comentário abaixo e reenvie.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="label-caps">Revisão final</p>
      <h1 className="text-[1.5rem] leading-8 font-semibold tracking-tight">
        Confira as respostas antes de enviar
      </h1>
    </div>
  );
}

function summarize(answer: Answer): string {
  switch (answer.kind) {
    case "text":
    case "longText":
      return answer.value;
    case "number":
      return answer.value === null ? "" : String(answer.value);
    case "list":
      return answer.value.filter(Boolean).join(", ");
    case "steps":
      return `${answer.value.filter((item) => item.what.trim()).length} passo(s) registrados`;
  }
}
