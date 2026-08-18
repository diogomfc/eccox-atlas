/**
 * Le a planilha oficial "PROCESSOS - V6 FINAL.xlsx" e emite prisma/seed/catalog.json.
 *
 * So a aba PROCESSOS entra — Politicas saiu do escopo do produto. Roda apenas em
 * desenvolvimento (`pnpm catalog:import`). O seed consome o JSON gerado, entao a
 * aplicacao nunca depende de xlsx em runtime.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workbookPath = resolve(projectRoot, "docs/PROCESSOS - V6 FINAL.xlsx");
const outputPath = resolve(projectRoot, "prisma/seed/catalog.json");

type Wave = "ONDA_1" | "ONDA_2" | "ONDA_3" | "CONCLUIDO";

interface AreaSeed {
  code: string;
  sigla: string;
  name: string;
  ownerName: string | null;
}

interface ProcessSeed {
  areaCode: string;
  code: string;
  name: string;
  objective: string | null;
  wave: Wave;
}

/**
 * As 19 areas reais da planilha V6. A sigla entra no codigo do processo
 * (POP-FIN-001) e precisa ser validada com cada area antes de qualquer
 * publicacao no portal interno.
 */
const AREAS: AreaSeed[] = [
  {
    code: "architecture-innovation",
    sigla: "ARQ",
    name: "Architecture & Innovation",
    ownerName: "José Ronaldo",
  },
  {
    code: "compliance-governance",
    sigla: "CGJ",
    name: "Compliance & Governance",
    ownerName: "Cássia Bueno",
  },
  { code: "customer-success", sigla: "CSU", name: "Customer Success", ownerName: "Renato Adriano" },
  {
    code: "engineering-dev-z",
    sigla: "EDZ",
    name: "Engineering & Technology (Dev Z)",
    ownerName: "Mauricio Souza",
  },
  {
    code: "engineering-dev-open",
    sigla: "EDO",
    name: "Engineering & Technology (Dev Open)",
    ownerName: "Roberta Hoffman",
  },
  {
    code: "engineering-qa",
    sigla: "EQA",
    name: "Engineering & Technology (QA)",
    ownerName: "Felipe Santos",
  },
  {
    code: "engineering-infra-z",
    sigla: "EIZ",
    name: "Engineering & Technology (Infra Z)",
    ownerName: "Elcio Carnelossi",
  },
  {
    code: "financial-administrative",
    sigla: "FIN",
    name: "Financial & Administrative",
    ownerName: "Milena Tamburro",
  },
  { code: "fpa", sigla: "FPA", name: "FP&A", ownerName: "David Panza" },
  {
    code: "infrastructure-security",
    sigla: "INS",
    name: "Infrastructure and Security",
    ownerName: "Fábio Ogawa",
  },
  { code: "marketing", sigla: "MKT", name: "Marketing", ownerName: "Paloma Costa" },
  {
    code: "people-performance",
    sigla: "PEP",
    name: "People & Performance",
    ownerName: "Marcella Prado",
  },
  { code: "pmo", sigla: "PMO", name: "PMO", ownerName: "Carolina Schuch" },
  { code: "pre-sales", sigla: "PRV", name: "Pre-Sales", ownerName: "Edison Mello" },
  { code: "sales-revenue", sigla: "SAL", name: "Sales & Revenue", ownerName: "Thiago Costa" },
  {
    code: "service-delivery-pedro",
    sigla: "SDP",
    name: "Service Delivery — Pedro Vara",
    ownerName: "Pedro Vara",
  },
  {
    code: "service-delivery-thiago",
    sigla: "SDT",
    name: "Service Delivery — Thiago Machado",
    ownerName: "Thiago Machado",
  },
  {
    code: "software-delivery",
    sigla: "SWD",
    name: "Software Delivery",
    ownerName: "Waldeir Crepaldi",
  },
  {
    code: "transversal-gestao",
    sigla: "TRG",
    name: "Transversal (Gestão)",
    ownerName: "Vinícius Costa",
  },
];

const AREA_BY_NAME = new Map(AREAS.map((area) => [area.name, area]));

function parseWave(value: unknown): Wave {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (text.startsWith("conclu")) return "CONCLUIDO";
  if (text.includes("1")) return "ONDA_1";
  if (text.includes("3")) return "ONDA_3";
  return "ONDA_2";
}

function text(value: unknown): string | null {
  const result = String(value ?? "").trim();
  return result.length > 0 ? result : null;
}

/** Sequencial por area, na ordem em que a planilha lista os processos. */
function makeCodeFactory() {
  const counters = new Map<string, number>();
  return (sigla: string) => {
    const next = (counters.get(sigla) ?? 0) + 1;
    counters.set(sigla, next);
    return `POP-${sigla}-${String(next).padStart(3, "0")}`;
  };
}

function main() {
  const workbook = XLSX.readFile(workbookPath);
  const nextCode = makeCodeFactory();
  const processes: ProcessSeed[] = [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.PROCESSOS, {
    header: 1,
    defval: null,
  });

  for (const row of rows.slice(1)) {
    const areaName = text(row[1]);
    if (!areaName) continue;
    const area = AREA_BY_NAME.get(areaName);
    if (!area) throw new Error(`Area desconhecida na aba PROCESSOS: "${areaName}"`);

    processes.push({
      areaCode: area.code,
      code: nextCode(area.sigla),
      name: String(row[3]).trim(),
      objective: text(row[4]),
      wave: parseWave(row[12] ?? row[11]),
    });
  }

  const catalog = { areas: AREAS, processes };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  const byWave = processes.reduce<Record<string, number>>((acc, item) => {
    acc[item.wave] = (acc[item.wave] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Catalogo gravado em ${outputPath}`);
  console.log(`Areas: ${AREAS.length}`);
  console.log(`Processos: ${processes.length}`, byWave);
}

main();
