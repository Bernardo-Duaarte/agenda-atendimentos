import { prisma } from "./prisma";

/**
 * Saldo de estoque = soma dos movimentos. Não existe campo "quantidade" no
 * produto de propósito (ver o comentário no topo do schema): assim o saldo
 * nunca diverge do histórico que o explica.
 */
export async function saldosPorProduto(): Promise<Map<string, number>> {
  const linhas = await prisma.movimentoEstoque.groupBy({
    by: ["produtoId"],
    _sum: { quantidade: true },
  });

  return new Map(linhas.map((l) => [l.produtoId, Number(l._sum.quantidade ?? 0)]));
}

export async function saldoDoProduto(produtoId: string): Promise<number> {
  const r = await prisma.movimentoEstoque.aggregate({
    where: { produtoId },
    _sum: { quantidade: true },
  });
  return Number(r._sum.quantidade ?? 0);
}

/** Quantidade formatada sem zeros à toa: 2.500 -> "2,5"; 3.000 -> "3". */
export function formatarQuantidade(n: number, unidade?: string): string {
  const texto = n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  return unidade ? `${texto} ${unidade}` : texto;
}

const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

/**
 * Lista para a tela de produtos, com saldo e alertas já resolvidos.
 *
 * Os alertas nascem aqui, e não no componente, porque dependem da hora atual —
 * e ler o relógio durante o render é impuro: o React pode renderizar de novo e
 * obter outro resultado. Buscar dados é o lugar certo para isso.
 */
export async function produtosComEstoque() {
  const [produtos, saldos] = await Promise.all([
    prisma.produto.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    saldosPorProduto(),
  ]);

  const agora = Date.now();

  return produtos.map((p) => {
    const saldo = saldos.get(p.id) ?? 0;
    const minimo = Number(p.estoqueMinimo);
    return {
      ...p,
      saldo,
      minimo,
      repor: saldo <= minimo,
      vencendo: p.validade != null && p.validade.getTime() - agora < TRINTA_DIAS,
    };
  });
}

/** Resumo para a tela inicial: quantos produtos e quantos precisam repor. */
export async function resumoDoEstoque(): Promise<{ total: number; aRepor: number }> {
  const [produtos, saldos] = await Promise.all([
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, estoqueMinimo: true } }),
    saldosPorProduto(),
  ]);
  return {
    total: produtos.length,
    aRepor: produtos.filter((p) => (saldos.get(p.id) ?? 0) <= Number(p.estoqueMinimo)).length,
  };
}
