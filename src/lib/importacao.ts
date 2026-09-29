import { normalizarTelefone } from "./telefone";

/**
 * Decisões da importação de contatos, sem banco e sem Server Action.
 *
 * Separadas porque é aqui que mora o que pode dar errado — número inválido que
 * passa, cliente criada duas vezes, lote grande demais — e nada disso dá para
 * conferir de dentro de uma função que precisa de sessão e de conexão.
 */

export type ContatoEscolhido = { nome: string; telefone: string };

/** Teto do lote. Uma agenda de telefone pode ter milhares de nomes. */
export const MAXIMO_POR_VEZ = 500;

export type Preparo =
  | { ok: false; erro: string }
  | {
      ok: true;
      /** Nome por número já em E.164, sem repetição: o que vale gravar. */
      porNumero: Map<string, string>;
    };

/**
 * Valida e desduplica o que chegou do navegador.
 *
 * A tela já fez isso, mas não conta: uma Server Action é um endpoint POST de
 * verdade, e o corpo dela pode ter sido montado à mão.
 */
export function prepararContatos(escolhidos: ContatoEscolhido[]): Preparo {
  if (escolhidos.length === 0) {
    return { ok: false, erro: "Marque pelo menos uma pessoa para importar." };
  }
  if (escolhidos.length > MAXIMO_POR_VEZ) {
    return {
      ok: false,
      erro: `São muitos de uma vez. Importe em partes de até ${MAXIMO_POR_VEZ}.`,
    };
  }

  // O mesmo número marcado duas vezes valeria duas clientes: sem isto, o
  // próprio lote criaria a duplicata que ele existe para evitar.
  const porNumero = new Map<string, string>();
  for (const c of escolhidos) {
    const numero = normalizarTelefone(c.telefone);
    const nome = c.nome.trim();
    if (!numero || !nome) continue;
    if (!porNumero.has(numero)) porNumero.set(numero, nome);
  }

  if (porNumero.size === 0) {
    return {
      ok: false,
      erro: "Nenhum dos contatos marcados tem nome e número aproveitáveis.",
    };
  }

  return { ok: true, porNumero };
}

/** Tira quem já está no cadastro. `jaCadastrados` vem de uma consulta ao banco. */
export function separarNovos(
  porNumero: Map<string, string>,
  jaCadastrados: Iterable<string>,
): { novos: ContatoEscolhido[]; jaExistiam: number } {
  const existentes = new Set(jaCadastrados);
  const novos: ContatoEscolhido[] = [];

  for (const [telefone, nome] of porNumero) {
    if (existentes.has(telefone)) continue;
    novos.push({ nome, telefone });
  }

  return { novos, jaExistiam: porNumero.size - novos.length };
}
