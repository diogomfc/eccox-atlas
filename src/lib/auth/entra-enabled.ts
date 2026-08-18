/**
 * Enquanto o App Registration da TI nao estiver pronto, o Atlas roda com
 * usuarios mock. Mesmo mecanismo ja usado em eci-studio-frontend.
 */
export function isEntraAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENTRA_ENABLED === "true";
}

/**
 * O diretorio completo de colaboradores (Fase B) precisa do escopo
 * `User.Read.All`, uma permissao restrita que exige consentimento previo de
 * um administrador do tenant. Pedir esse escopo sem o consentimento travar
 * o login inteiro, entao fica atras de uma flag separada do login basico —
 * so ligar depois que o TI confirmar o consentimento no App Registration.
 */
export function isEntraDirectoryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENTRA_DIRECTORY_ENABLED === "true";
}
