import { redirect } from "next/navigation";

/**
 * Listagem redundante desde que `/processos` ganhou o botão de editar
 * estrutura/roteiro por linha — mantém a URL antiga viva só pra não quebrar
 * link salvo em algum lugar.
 */
export default function AdminProcessesRedirect() {
  redirect("/processos");
}
