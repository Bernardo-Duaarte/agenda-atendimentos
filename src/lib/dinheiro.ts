/**
 * Dinheiro circula pelo sistema inteiro como Int em centavos. Estas duas
 * funções são a única fronteira com texto — não faça conta com o valor
 * formatado nem guarde Float em lugar nenhum.
 */

export function formatarReal(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** "R$ 1.234,56", "1234,56" ou "1234.56" -> 123456 */
export function paraCentavos(texto: string): number {
  let s = texto.trim().replace(/[R$\s]/g, "");

  // Formato pt-BR: a vírgula é o decimal, então os pontos são de milhar.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");

  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Valor inválido: "${texto}"`);
  return Math.round(n * 100);
}

/** Valor para preencher um <input>: 15000 -> "150,00" (sem o "R$"). */
export function paraCampoReal(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
