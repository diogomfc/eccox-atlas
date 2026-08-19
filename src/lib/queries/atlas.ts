import "server-only";
import type { ProcessStatus, Wave } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isCovered, WAVE_ORDER } from "@/lib/domain";

export interface AreaSummary {
  id: string;
  code: string;
  sigla: string;
  name: string;
  ownerName: string | null;
  total: number;
  covered: number;
  waves: Record<Wave, number>;
  dominantWave: Wave;
}

export interface AtlasOverview {
  areas: AreaSummary[];
  totals: {
    areas: number;
    processes: number;
    covered: number;
    waves: Record<Wave, number>;
  };
}

function emptyWaves(): Record<Wave, number> {
  return { ONDA_1: 0, ONDA_2: 0, ONDA_3: 0, CONCLUIDO: 0 };
}

export async function getAtlasOverview(): Promise<AtlasOverview> {
  const areas = await db.area.findMany({
    orderBy: { name: "asc" },
    include: {
      processes: { select: { wave: true, status: true } },
    },
  });

  const totals = { areas: areas.length, processes: 0, covered: 0, waves: emptyWaves() };

  const summaries = areas.map((area) => {
    const waves = emptyWaves();
    let covered = 0;

    for (const process of area.processes) {
      waves[process.wave] += 1;
      totals.waves[process.wave] += 1;
      if (isCovered(process.status)) covered += 1;
    }

    totals.processes += area.processes.length;
    totals.covered += covered;

    const dominantWave = WAVE_ORDER.reduce<Wave>(
      (best, wave) => (waves[wave] > waves[best] ? wave : best),
      "ONDA_1",
    );

    return {
      id: area.id,
      code: area.code,
      sigla: area.sigla,
      name: area.name,
      ownerName: area.ownerName,
      total: area.processes.length,
      covered,
      waves,
      dominantWave,
    } satisfies AreaSummary;
  });

  return { areas: summaries, totals };
}

export interface AreaDetail {
  id: string;
  code: string;
  sigla: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerId: string | null;
  processes: Array<{
    id: string;
    code: string;
    name: string;
    objective: string | null;
    relatedPolicyRef: string | null;
    wave: Wave;
    status: ProcessStatus;
    ownerName: string | null;
  }>;
}

export async function getAreaDetail(code: string): Promise<AreaDetail | null> {
  const area = await db.area.findUnique({
    where: { code },
    include: {
      processes: { orderBy: [{ status: "asc" }, { code: "asc" }] },
    },
  });

  if (!area) return null;

  return {
    id: area.id,
    code: area.code,
    sigla: area.sigla,
    name: area.name,
    ownerName: area.ownerName,
    ownerEmail: area.ownerEmail,
    ownerId: area.ownerId,
    processes: area.processes.map((process) => ({
      id: process.id,
      code: process.code,
      name: process.name,
      objective: process.objective,
      relatedPolicyRef: process.relatedPolicyRef,
      wave: process.wave,
      status: process.status,
      ownerName: process.ownerName,
    })),
  };
}

export async function listAreaCodes(): Promise<string[]> {
  try {
    const areas = await db.area.findMany({ select: { code: true } });
    return areas.map((area) => area.code);
  } catch {
    return [];
  }
}


export async function listAreasForForm() {
  return db.area.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, sigla: true },
  });
}
