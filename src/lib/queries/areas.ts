import "server-only";
import { db } from "@/lib/db";

/** Áreas com dono (se houver) e contagem de processos vinculados — base do
 * modal de gerenciamento e da trava de exclusão. */
export async function listAreasWithProcessCount() {
  const areas = await db.area.findMany({
    orderBy: { name: "asc" },
    include: { owner: true, _count: { select: { processes: true } } },
  });
  return areas;
}
