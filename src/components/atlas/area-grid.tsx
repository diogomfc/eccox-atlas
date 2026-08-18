"use client";

import { ArrowUpRight, LayoutGrid, List, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { CoverageRing } from "@/components/atlas/coverage-ring";
import { WaveBar } from "@/components/atlas/wave-bar";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Wave } from "@/generated/prisma/client";
import { WAVE_LABEL, WAVE_ORDER } from "@/lib/domain";
import type { AreaSummary } from "@/lib/queries/atlas";
import { cn } from "@/lib/utils";

type WaveFilter = Wave | "TODAS";
type ViewMode = "cards" | "list";

interface AreaGridProps {
  areas: AreaSummary[];
  /** Ação extra no fim da barra de filtros — ex: botão "Novo processo". */
  actions?: ReactNode;
}

const CARD_TRANSITION = { type: "spring", stiffness: 320, damping: 32, mass: 0.7 } as const;
const PAGE_SIZE = { cards: 9, list: 10 } as const;

export function AreaGrid({ areas, actions }: AreaGridProps) {
  const [wave, setWave] = useState<WaveFilter>("TODAS");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("cards");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return areas
      .filter((area) => (wave === "TODAS" ? true : area.waves[wave] > 0))
      .filter((area) =>
        term.length === 0
          ? true
          : area.name.toLowerCase().includes(term) ||
            area.sigla.toLowerCase().includes(term) ||
            (area.ownerName ?? "").toLowerCase().includes(term),
      );
  }, [areas, wave, query]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reseta a página quando o filtro muda
  useEffect(() => {
    setPage(1);
  }, [wave, query, view]);

  const pageSize = PAGE_SIZE[view];
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {(["TODAS", ...WAVE_ORDER] as WaveFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setWave(option)}
              className={cn(
                "relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                wave === option ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {wave === option ? (
                <motion.span
                  layoutId="wave-filter-pill"
                  className="absolute inset-0 rounded-md bg-accent"
                  transition={CARD_TRANSITION}
                />
              ) : null}
              <span className="relative">
                {option === "TODAS" ? "Todas as ondas" : WAVE_LABEL[option]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative ml-auto w-full max-w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar área ou dono"
            aria-label="Buscar área ou dono"
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            aria-label="Visualização em cards"
            onClick={() => setView("cards")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "cards" ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Visualização em lista"
            onClick={() => setView("list")}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              view === "list" ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
          >
            <List className="size-3.5" />
          </button>
        </div>

        {actions ? <div key="area-grid-actions">{actions}</div> : null}
      </div>

      {visible.length === 0 ? (
        <p className="surface-panel px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhuma área corresponde a esse filtro.
        </p>
      ) : view === "cards" ? (
        <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((area, index) => (
              <motion.li
                key={area.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index * 0.025, 0.3) } }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={CARD_TRANSITION}
              >
                <AreaCard area={area} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <motion.ul layout className="surface-panel divide-y divide-border">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((area) => (
              <motion.li
                key={area.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={CARD_TRANSITION}
              >
                <AreaRow area={area} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Página {page} de {totalPages} — {filtered.length} área(s)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "disabled:opacity-40",
              )}
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "disabled:opacity-40",
              )}
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AreaRow({ area }: { area: AreaSummary }) {
  return (
    <Link
      href={`/atlas/${area.code}`}
      className="group flex items-center gap-4 p-4 transition-colors hover:bg-accent/40"
    >
      <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[0.625rem] tracking-widest text-brand">
        {area.sigla}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{area.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {area.ownerName ?? "Dono a definir"}
        </p>
      </div>
      <WaveBar waves={area.waves} className="hidden w-40 shrink-0 sm:block" />
      <span className="font-mono text-xs text-muted-foreground">{area.total} processo(s)</span>
      <CoverageRing covered={area.covered} total={area.total} />
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
    </Link>
  );
}

function AreaCard({ area }: { area: AreaSummary }) {
  return (
    <Link
      href={`/atlas/${area.code}`}
      className="group surface-panel block h-full p-5 transition-colors hover:border-ring focus-visible:border-ring focus-visible:outline-none"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[0.625rem] tracking-widest text-brand">
            {area.sigla}
          </span>

          <h3 className="mt-2 text-[1.0625rem] leading-6 font-semibold tracking-tight">
            {area.name}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {area.ownerName ?? "Dono a definir"}
          </p>
        </div>

        <CoverageRing covered={area.covered} total={area.total} />
      </div>

      <dl className="mt-4 flex items-center gap-5">
        <div>
          <dt className="label-caps">Processos</dt>
          <dd className="font-mono text-lg leading-6">{area.total}</dd>
        </div>
        <ArrowUpRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
      </dl>

      <WaveBar waves={area.waves} className="mt-4" />
    </Link>
  );
}
