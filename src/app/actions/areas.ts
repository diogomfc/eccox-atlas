"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { listAreasWithProcessCount } from "@/lib/queries/areas";

async function requireGestor() {
  const session = await auth();
  if (!session?.user || session.user.role !== "GESTOR") {
    throw new Error("Só um gestor pode gerenciar áreas.");
  }
  return session;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function siglaFrom(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (words.length >= 2)
    return words
      .map((word) => word[0])
      .join("")
      .slice(0, 4);
  return (words[0] ?? "AREA").slice(0, 3);
}

/** Garante unicidade de `code`/`sigla` tentando sufixos numéricos. */
async function uniqueField(
  field: "code" | "sigla",
  base: string,
  excludeId?: string,
): Promise<string> {
  let candidate = base;
  let attempt = 1;
  while (
    await db.area.findFirst({
      where: { [field]: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    attempt += 1;
    candidate = `${base}${attempt}`;
  }
  return candidate;
}

const areaSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da área."),
  ownerId: z.string().trim().optional(),
});

export async function createArea(input: unknown): Promise<ActionResult> {
  await requireGestor();
  const parsed = areaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { name, ownerId } = parsed.data;

  const existing = await db.area.findUnique({ where: { name } });
  if (existing) return { ok: false, error: "Já existe uma área com esse nome." };

  const code = await uniqueField("code", slugify(name));
  const sigla = await uniqueField("sigla", siglaFrom(name));

  const area = await db.area.create({
    data: { name, code, sigla, ownerId: ownerId || null },
  });

  revalidatePath("/processos");
  revalidatePath("/atlas");
  return { ok: true, id: area.id };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Informe o nome da área."),
  ownerId: z.string().trim().optional(),
});

export async function updateArea(input: unknown): Promise<ActionResult> {
  await requireGestor();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { id, name, ownerId } = parsed.data;

  const existing = await db.area.findFirst({ where: { name, id: { not: id } } });
  if (existing) return { ok: false, error: "Já existe uma área com esse nome." };

  await db.area.update({ where: { id }, data: { name, ownerId: ownerId || null } });

  revalidatePath("/processos");
  revalidatePath("/atlas");
  return { ok: true };
}

/** Lista de áreas + contagem de processos, para o modal de gerenciamento. */
export async function listAreasForManagement() {
  await requireGestor();
  return listAreasWithProcessCount();
}

export async function deleteArea(id: string): Promise<ActionResult> {
  await requireGestor();
  const count = await db.process.count({ where: { areaId: id } });
  if (count > 0) {
    return {
      ok: false,
      error: `Não é possível remover esta área pois existem ${count} processo(s) vinculados a ela. Remova ou reatribua os processos antes de excluir.`,
    };
  }

  await db.area.delete({ where: { id } });
  revalidatePath("/processos");
  revalidatePath("/atlas");
  return { ok: true };
}
