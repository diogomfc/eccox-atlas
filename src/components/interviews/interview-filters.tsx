"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTERVIEW_STATUS_LABEL } from "@/lib/domain";

const ALL = "__all__";

interface InterviewFiltersProps {
  areas: Array<{ id: string; name: string; sigla: string }>;
  respondents: Array<{ id: string; name: string }>;
}

export function InterviewFilters({ areas, respondents }: InterviewFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  // biome-ignore lint/correctness/useExhaustiveDependencies: dispara só quando o texto muda
  useEffect(() => {
    const timeout = setTimeout(() => setParam("q", q), 300);
    return () => clearTimeout(timeout);
  }, [q]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}` as Parameters<typeof router.push>[0]);
  }

  const areaOptions = [
    { value: ALL, label: "Todas as áreas" },
    ...areas.map((area) => ({ value: area.id, label: `${area.sigla} — ${area.name}` })),
  ];
  const respondentOptions = [
    { value: ALL, label: "Todos os colaboradores" },
    ...respondents.map((respondent) => ({ value: respondent.id, label: respondent.name })),
  ];

  const hasFilters = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Buscar por processo ou colaborador"
          className="pl-8"
        />
      </div>

      <Select
        items={{ [ALL]: "Todos os status", ...INTERVIEW_STATUS_LABEL }}
        value={searchParams.get("status") ?? ALL}
        onValueChange={(next) => setParam("status", String(next))}
      >
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os status</SelectItem>
          {Object.entries(INTERVIEW_STATUS_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Combobox
        options={areaOptions}
        value={searchParams.get("areaId") ?? ALL}
        onValueChange={(next) => setParam("areaId", next)}
        className="h-9 w-48"
        placeholder="Todas as áreas"
        searchPlaceholder="Buscar área…"
      />

      <Combobox
        options={respondentOptions}
        value={searchParams.get("respondentUserId") ?? ALL}
        onValueChange={(next) => setParam("respondentUserId", next)}
        className="h-9 w-52"
        placeholder="Todos os colaboradores"
        searchPlaceholder="Buscar colaborador…"
      />

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push(pathname as Parameters<typeof router.push>[0]);
          }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
          Limpar
        </button>
      ) : null}
    </div>
  );
}
