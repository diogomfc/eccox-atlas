/**
 * Popula o Atlas com o catalogo oficial V6: 19 areas e 79 processos, cada um
 * com o roteiro padrao de entrevista (secoes 1-4 do modelo POP V3).
 * Consome prisma/seed/catalog.json, gerado por `pnpm catalog:import`.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Wave } from "../src/generated/prisma/client.js";
import { DEFAULT_PROCESS_SECTIONS } from "../src/lib/process-templates/default-questions.js";

interface CatalogArea {
  code: string;
  sigla: string;
  name: string;
  ownerName: string | null;
}

interface CatalogProcess {
  areaCode: string;
  code: string;
  name: string;
  objective: string | null;
  wave: Wave;
}

const catalogPath = resolve(dirname(fileURLToPath(import.meta.url)), "seed/catalog.json");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
  areas: CatalogArea[];
  processes: CatalogProcess[];
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const areaIdByCode = new Map<string, string>();

  for (const area of catalog.areas) {
    const record = await prisma.area.upsert({
      where: { code: area.code },
      update: { sigla: area.sigla, name: area.name, ownerName: area.ownerName },
      create: {
        code: area.code,
        sigla: area.sigla,
        name: area.name,
        ownerName: area.ownerName,
      },
    });
    areaIdByCode.set(area.code, record.id);
  }

  for (const item of catalog.processes) {
    const areaId = areaIdByCode.get(item.areaCode);
    if (!areaId) throw new Error(`Area nao semeada: ${item.areaCode}`);

    const process = await prisma.process.upsert({
      where: { code: item.code },
      update: { areaId, name: item.name, objective: item.objective, wave: item.wave },
      create: {
        code: item.code,
        areaId,
        name: item.name,
        objective: item.objective,
        wave: item.wave,
      },
    });

    const hasSections = await prisma.processSection.count({ where: { processId: process.id } });
    if (hasSections > 0) continue;

    for (const section of DEFAULT_PROCESS_SECTIONS) {
      await prisma.processSection.create({
        data: {
          processId: process.id,
          label: section.label,
          order: section.order,
          questions: {
            createMany: {
              data: section.questions.map((question) => ({ ...question, processId: process.id })),
            },
          },
        },
      });
    }
  }

  const areas = await prisma.area.count();
  const processes = await prisma.process.count();
  const sections = await prisma.processSection.count();
  const questions = await prisma.processQuestion.count();
  console.log(
    `Seed concluido: ${areas} areas, ${processes} processos, ${sections} grupos, ${questions} perguntas cadastradas.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
