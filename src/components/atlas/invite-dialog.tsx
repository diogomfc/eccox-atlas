"use client";

import { Check, Copy, Link2, Loader2, Mail, Search, UserPlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createInterviewLink, listInviteCandidates } from "@/app/actions/interview-links";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Candidate {
  id: string;
  name: string;
  email: string;
  department: string | null;
  isPending: boolean;
}

interface InviteDialogProps {
  processes: Array<{ id: string; code: string; name: string }>;
}

/**
 * Convite de entrevista. A base é quem já logou no Atlas alguma vez (ou já foi
 * convidado antes) — o diretório completo do Entra ID (Fase B) ainda depende
 * de consentimento do admin do tenant, então por ora o convite por e-mail é o
 * caminho para quem nunca logou.
 */
export function InviteDialog({ processes }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [processId, setProcessId] = useState(processes[0]?.id ?? "");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [respondent, setRespondent] = useState<{ name: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    listInviteCandidates().then(setCandidates);
  }, [open]);

  function reset() {
    setUrl(null);
    setRespondent(null);
    setCopied(false);
    setError(null);
    setSelectedUserId(null);
    setManualName("");
    setManualEmail("");
    setQuery("");
  }

  const filtered = candidates.filter((candidate) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      candidate.name.toLowerCase().includes(term) || candidate.email.toLowerCase().includes(term)
    );
  });

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createInterviewLink({
        processId,
        respondentUserId: selectedUserId ?? undefined,
        respondentEmail: selectedUserId ? undefined : manualEmail,
        respondentName: selectedUserId ? undefined : manualName,
        expiresInDays: 30,
      });
      if (!result.ok || !result.link) {
        setError(result.error ?? "Não foi possível gerar o link.");
        return;
      }
      const selectedCandidate = candidates.find((candidate) => candidate.id === selectedUserId);
      setRespondent({
        name: selectedCandidate?.name ?? (manualName || "colaborador"),
        email: selectedCandidate?.email ?? manualEmail,
      });
      setUrl(result.link.url);
    });
  }

  const currentProcess = processes.find((item) => item.id === processId);
  const mailtoHref =
    url && respondent && currentProcess
      ? buildMailto({
          to: respondent.email,
          processName: currentProcess.name,
          respondentName: respondent.name,
          url,
        })
      : undefined;

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const items = Object.fromEntries(
    processes.map((item) => [item.id, `${item.code} — ${item.name}`]),
  );
  const canSubmit = Boolean(processId) && (Boolean(selectedUserId) || Boolean(manualEmail.trim()));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Link2 data-icon="inline-start" />
            Convidar
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar para entrevista</DialogTitle>
          <DialogDescription>
            O respondente precisa entrar com a conta convidada para acessar. Validade de 30 dias.
          </DialogDescription>
        </DialogHeader>

        {url ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Link gerado. Copie e envie para o respondente.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={url} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copy} aria-label="Copiar link">
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            {mailtoHref ? (
              <a
                href={mailtoHref}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Mail data-icon="inline-start" />
                Enviar por e-mail
              </a>
            ) : null}
            <Button variant="ghost" size="sm" onClick={reset}>
              Convidar outra pessoa
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid min-w-0 gap-1.5">
              <Label>Processo</Label>
              <Select
                items={items}
                value={processId}
                onValueChange={(next) => setProcessId(String(next))}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {processes.map((processItem) => (
                    <SelectItem key={processItem.id} value={processItem.id}>
                      <span className="font-mono text-[0.6875rem] text-brand">
                        {processItem.code}
                      </span>
                      <span className="truncate">{processItem.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Colaborador</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedUserId(null);
                  }}
                  placeholder="Buscar por nome ou e-mail"
                  className="pl-8"
                />
              </div>

              {query && filtered.length > 0 ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
                  {filtered.map((candidate) => (
                    <li key={candidate.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserId(candidate.id);
                          setQuery(candidate.name);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                          selectedUserId === candidate.id && "bg-accent",
                        )}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[0.625rem] font-semibold text-brand">
                          {initials(candidate.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{candidate.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {candidate.email}
                            {candidate.department ? ` · ${candidate.department}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {query && filtered.length === 0 && !selectedUserId ? (
                <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UserPlus className="size-3.5" />
                    Ninguém encontrado — convide por e-mail
                  </p>
                  <Input
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                    placeholder="Nome"
                  />
                  <Input
                    type="email"
                    value={manualEmail}
                    onChange={(event) => setManualEmail(event.target.value)}
                    placeholder="nome@eccox.com.br"
                  />
                </div>
              ) : null}
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <Button className="w-full" disabled={pending || !canSubmit} onClick={handleSubmit}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Gerar link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function buildMailto({
  to,
  processName,
  respondentName,
  url,
}: {
  to: string;
  processName: string;
  respondentName: string;
  url: string;
}): string {
  const subject = `[ECCOX Atlas] Convite para mapeamento de processo: ${processName}`;
  const body = [
    `Olá, ${respondentName}!`,
    "",
    `Você foi convidado(a) a mapear o processo "${processName}" no ECCOX Atlas.`,
    "Acesse o link abaixo, entre com sua conta corporativa e responda o roteiro — pode salvar e continuar depois se precisar.",
    "",
    url,
    "",
    "Equipe de Governança ECCOX",
  ].join("\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
