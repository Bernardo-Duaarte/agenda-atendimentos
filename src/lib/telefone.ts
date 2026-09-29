/**
 * Normalização de telefone brasileiro para o formato que o WhatsApp usa:
 * E.164 sem o '+', ou seja 55 + DDD + número.
 *
 * Separada da validação de formulário porque a importação de contatos precisa
 * da mesma regra sem estourar erro: lá, um número estranho no meio de
 * trezentos apenas vira "não deu para aproveitar".
 *
 * Contar dígitos não basta. Um celular brasileiro sem código do país tem 11
 * dígitos — igualzinho a um número dos Estados Unidos COM código (+1 415 555
 * 2671). Tratar os dois como iguais transformaria um contato internacional
 * numa cliente com número errado, e a mensagem iria para um desconhecido.
 *
 * Por isso duas pistas além do tamanho: o "+" explícito diz de que país é, e
 * celular brasileiro sempre tem 9 logo depois do DDD.
 */
export function normalizarTelefone(bruto: string): string | null {
  const internacional = /^\s*\+/.test(bruto);
  const digitos = bruto.replace(/\D/g, "");

  // "+" que não é do Brasil: número de fora, não dá para usar aqui.
  if (internacional && !digitos.startsWith("55")) return null;

  // Já com o código do país: 55 + DDD + 9 dígitos (celular) ou 8 (fixo).
  if ((digitos.length === 13 || digitos.length === 12) && digitos.startsWith("55")) {
    return digitos;
  }

  const ddd = Number(digitos.slice(0, 2));
  const dddValido = ddd >= 11 && ddd <= 99;

  // Sem código do país. No celular, o 9 depois do DDD é obrigatório desde
  // 2016 — é ele que separa um número daqui de um de fora com 11 dígitos.
  if (digitos.length === 11 && dddValido && digitos[2] === "9") return `55${digitos}`;
  if (digitos.length === 10 && dddValido) return `55${digitos}`;

  return null;
}
