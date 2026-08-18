/** Só aceita um caminho relativo interno — nunca um redirect pra fora do Atlas. */
export function safeRedirectTo(target: string | null | undefined, fallback = "/"): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return fallback;
  return target;
}
