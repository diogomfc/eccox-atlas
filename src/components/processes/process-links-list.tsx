"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { INTERVIEW_STATUS_LABEL } from "@/lib/domain";

interface LinkItem {
  id: string;
  token: string;
  respondentName: string;
  respondentEmail: string;
  interviewId: string | null;
  interviewStatus: "RASCUNHO" | "ENVIADA" | "EM_REVISAO" | "APROVADA" | null;
}

export function ProcessLinksList({ links, processId }: { links: LinkItem[]; processId: string }) {
  if (links.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum convite emitido ainda.</p>;
  }

  // Volta pra esta mesma tela, já na aba de Convites — ver src/app/(gestor)/entrevistas/[id]/page.tsx.
  const from = encodeURIComponent(`/processos/${processId}?tab=invites`);

  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li
          key={link.id}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{link.respondentName}</p>
            <p className="truncate text-xs text-muted-foreground">{link.respondentEmail}</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {link.interviewStatus ? INTERVIEW_STATUS_LABEL[link.interviewStatus] : "Não iniciada"}
          </span>
          {link.interviewId ? (
            <Link
              href={`/entrevistas/${link.interviewId}?from=${from}`}
              className="text-xs font-medium text-brand hover:underline"
            >
              {link.interviewStatus === "ENVIADA" ? "Revisar" : "Ver respostas"}
            </Link>
          ) : null}
          <CopyButton token={link.token} />
        </li>
      ))}
    </ul>
  );
}

function CopyButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/entrevista/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Copiar link">
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
