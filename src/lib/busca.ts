/**
 * Regra de busca por cliente, num lugar só.
 *
 * Existe porque a mesma busca aparece em três telas — a lista de clientes, a
 * escolha de quem vai ser atendida e a importação de contatos — e três cópias
 * divergem.
 *
 * Duas coisas que a busca tinha de errado e que esta função resolve:
 *
 *  1. Acento. Procurar "julia" não achava "Júlia", e quase todo nome da lista
 *     tem acento. O Postgres não ignora acento por conta própria, então a
 *     comparação é feita aqui, sobre o texto já sem acento.
 *
 *  2. Telefone vazio. A busca antiga procurava o termo no telefone também, e
 *     um nome não tem dígito nenhum — procurar "" no telefone casava com TODAS
 *     as clientes, o que anulava o filtro do nome e devolvia a lista inteira.
 *     Por isso o telefone só entra quando há dígitos de verdade.
 */

/** Minúscula e sem acento: é a forma em que os dois lados são comparados. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export type AlvoBusca = { nome: string; telefone: string };

/** Mínimo de dígitos para valer como busca por telefone. */
const MINIMO_DIGITOS = 3;

export function clienteCombina(cliente: AlvoBusca, termo: string): boolean {
  const alvo = normalizarBusca(termo);
  // Busca vazia mostra todo mundo: é a lista normal.
  if (!alvo) return true;

  if (normalizarBusca(cliente.nome).includes(alvo)) return true;

  const digitos = termo.replace(/\D/g, "");
  if (digitos.length < MINIMO_DIGITOS) return false;

  return cliente.telefone.includes(digitos);
}

export function filtrarClientes<T extends AlvoBusca>(clientes: T[], termo: string): T[] {
  if (!normalizarBusca(termo)) return clientes;
  return clientes.filter((c) => clienteCombina(c, termo));
}
