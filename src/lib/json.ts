import type { Prisma } from "@/generated/prisma/client";

/**
 * Ponte entre um valor TypeScript já JSON-seguro e o `InputJsonValue` que o
 * Prisma 7 espera em colunas `Json`. O round-trip garante que o valor é
 * literalmente serializável — não é só um cast enganando o compilador.
 */
export function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
