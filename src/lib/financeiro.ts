/**
 * Contas de um atendimento: o que foi combinado, o que entrou, o que falta e
 * o que sobra.
 *
 * Duas regras de negócio moram aqui, e as duas vieram de decisões suas:
 *
 * 1. O sinal confirma o horário. Registrar um pagamento do tipo SINAL é o que
 *    transforma um pré-agendamento em atendimento garantido.
 * 2. Cancelou, o sinal fica. Por isso um atendimento cancelado continua tendo
 *    receita, e o que não foi pago deixa de ser cobrável.
 */

/** Status em que não se espera mais receber o restante. */
const NAO_SE_COBRA_MAIS = ["CANCELADO", "FALTOU"] as const;

export type StatusAtendimento =
  | "PRE_AGENDAMENTO"
  | "PENDENTE"
  | "CONFIRMADO"
  | "CONCLUIDO"
  | "CANCELADO"
  | "FALTOU";

export type ResumoFinanceiro = {
  /** Preço do serviço mais a taxa de deslocamento. */
  total: number;
  /** Sinal combinado para este atendimento. */
  sinal: number;
  /** Soma de tudo que entrou, já descontadas as devoluções. */
  recebido: number;
  /** Quanto do sinal já entrou. */
  sinalRecebido: number;
  /** O sinal foi coberto? É o que garante o horário. */
  sinalQuitado: boolean;
  /** Ainda cobrável. Zero quando cancelado ou faltou. */
  aReceber: number;
  /** Custo dos produtos: o real quando concluído, a estimativa antes disso. */
  custoProdutos: number;
  custoEhEstimativa: boolean;
  /** O que sobrou do que já entrou, depois do produto. */
  sobra: number;
};

export function calcularSinal(precoCentavos: number, percentual: number): number {
  return Math.round((precoCentavos * percentual) / 100);
}

export function resumoFinanceiro(a: {
  status: StatusAtendimento;
  precoCentavos: number;
  taxaDeslocamentoCentavos: number;
  sinalCentavos: number;
  pagamentos: { tipo: string; valorCentavos: number }[];
  /** Baixas já lançadas, com o custo congelado no momento da conclusão. */
  movimentos: { tipo: string; custoTotalCentavos: number | null }[];
  /** Ficha técnica do serviço, para estimar antes de concluir. */
  insumos: { quantidade: unknown; produto: { custoUnitarioCentavos: number } }[];
}): ResumoFinanceiro {
  const total = a.precoCentavos + a.taxaDeslocamentoCentavos;

  // Devolução já vem negativa do banco, então somar basta.
  const recebido = a.pagamentos.reduce((t, p) => t + p.valorCentavos, 0);
  const sinalRecebido = a.pagamentos
    .filter((p) => p.tipo === "SINAL" || p.tipo === "DEVOLUCAO")
    .reduce((t, p) => t + p.valorCentavos, 0);

  const encerrado = (NAO_SE_COBRA_MAIS as readonly string[]).includes(a.status);
  const aReceber = encerrado ? 0 : Math.max(0, total - recebido);

  const consumo = a.movimentos.filter((m) => m.tipo === "CONSUMO");
  const custoReal = consumo.reduce((t, m) => t + (m.custoTotalCentavos ?? 0), 0);

  // Antes de concluir não há consumo lançado; a ficha técnica diz o que
  // deve sair, e o custo atual do produto dá a estimativa.
  const custoEhEstimativa = consumo.length === 0;
  const custoProdutos = custoEhEstimativa
    ? a.insumos.reduce((t, i) => t + Math.round(Number(i.quantidade) * i.produto.custoUnitarioCentavos), 0)
    : custoReal;

  return {
    total,
    sinal: a.sinalCentavos,
    recebido,
    sinalRecebido,
    sinalQuitado: a.sinalCentavos > 0 && sinalRecebido >= a.sinalCentavos,
    aReceber,
    custoProdutos,
    custoEhEstimativa,
    // Do que ENTROU, e não do que foi combinado: é o dinheiro que existe.
    sobra: recebido - (custoEhEstimativa ? 0 : custoProdutos),
  };
}

export const ROTULO_FORMA = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  TRANSFERENCIA: "Transferência",
} as const;

export const ROTULO_TIPO_PAGAMENTO = {
  SINAL: "Sinal",
  RESTANTE: "Restante",
  EXTRA: "Extra",
  DEVOLUCAO: "Devolução",
} as const;
