import type { UserRole } from "@/generated/prisma/client";

/** Usuarios de desenvolvimento, usados apenas quando o Entra ID esta desligado. */
export interface MockUser {
  id: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  role: UserRole;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "mock-gestor",
    name: "Governança ECCOX",
    email: "governanca@eccox.com.br",
    department: "Compliance & Governance",
    jobTitle: "Coordenadora de Governança",
    role: "GESTOR",
  },
  {
    id: "mock-colaborador",
    name: "Eccoxer de Teste",
    email: "colaborador@eccox.com.br",
    department: "Transversal (Gestão)",
    jobTitle: "Analista de Processos",
    role: "COLABORADOR",
  },
];

export function findMockUser(id: string): MockUser | undefined {
  return MOCK_USERS.find((user) => user.id === id);
}
