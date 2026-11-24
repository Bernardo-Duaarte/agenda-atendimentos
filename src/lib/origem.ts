/**
 * Como a cliente chegou até você.
 *
 * Fica aqui, e não como enum do banco, porque a lista muda: uma rede nova
 * aparece e isso não deve exigir migração. O banco guarda a chave como texto,
 * e a tela só oferece as opções daqui — então não entra nada digitado errado.
 *
 * Acrescentar uma origem é acrescentar uma linha. Nunca mude uma CHAVE já em
 * uso: ela está gravada nas clientes cadastradas, e trocá-la perderia a
 * informação delas. Para corrigir o nome mostrado, mude só o rótulo.
 */

export const ORIGENS = [
  { chave: "INDICACAO", rotulo: "Indicação" },
  { chave: "INSTAGRAM", rotulo: "Instagram" },
  { chave: "GOOGLE", rotulo: "Google" },
  { chave: "WHATSAPP", rotulo: "WhatsApp" },
  { chave: "JA_CONHECIA", rotulo: "Já me conhecia" },
  { chave: "OUTRO", rotulo: "Outro" },
] as const;

export type ChaveOrigem = (typeof ORIGENS)[number]["chave"];

const PELA_CHAVE = new Map(ORIGENS.map((o) => [o.chave as string, o.rotulo]));

/** Aceita qualquer texto: o banco pode ter uma origem que saiu da lista. */
export function rotuloOrigem(chave: string | null | undefined): string | null {
  if (!chave) return null;
  return PELA_CHAVE.get(chave) ?? chave;
}

/** Valida o que veio do formulário. Fora da lista vira nulo, não erro. */
export function origemValida(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return PELA_CHAVE.has(valor) ? valor : null;
}
