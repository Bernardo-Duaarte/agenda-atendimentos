import "server-only";
import { prisma } from "./prisma";
import { paraUtc } from "./tempo";
import { resumoFinanceiro } from "./financeiro";
import { ESTOQUE_ATIVO } from "./recursos";

/**
 * Relatório do mês, em duas contas que nunca se somam.
 *
 *   TRABALHO — pela data do atendimento. "O que eu fiz em setembro, quanto
 *              disso é meu depois das parceiras, quanto já recebi e quanto
 *              ainda vou receber."
 *
 *   CAIXA    — pela data do pagamento. "Quanto dinheiro entrou em setembro",
 *              venha de qual atendimento vier.
 *
 * As duas são necessárias porque quase metade dos pagamentos pertence a um mês
 * diferente do atendimento: noiva paga parcelado meses antes da festa.
 *
 * O que elas NÃO podem é se misturar numa terceira. A versão anterior fazia
 * "entrou no mês menos repasses do mês", com o primeiro termo pela data do
 * pagamento e o segundo pela data do atendimento. Isso produzia novembro com
 * -R$ 180,00: nenhum pagamento caiu em novembro, mas havia um atendimento de
 * novembro com repasse. Por isso aqui não existe nenhum campo que atravesse os
 * dois blocos.
 */

/** O trabalho está fechado: entra na conta do mês. */
const CONTA_COMO_TRABALHO = ["PENDENTE", "CONFIRMADO", "CONCLUIDO"] as const;

/** Não aconteceu. Fica fora da conta, mas o dinheiro retido é mostrado. */
const NAO_ACONTECEU = ["CANCELADO", "FALTOU"] as const;

export function limitesDoMes(mes: string): { inicio: Date; fim: Date } {
  const [ano, m] = mes.split("-").map(Number);
  const inicio = paraUtc(`${mes}-01`, "00:00");
  const proximo = m === 12 ? `${ano! + 1}-01` : `${ano}-${String(m! + 1).padStart(2, "0")}`;
  return { inicio, fim: paraUtc(`${proximo}-01`, "00:00") };
}

export function mesAtual(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
}

export function deslocarMes(mes: string, passos: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const total = ano! * 12 + (m! - 1) + passos;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export async function relatorioDoMes(mes: string) {
  const { inicio, fim } = limitesDoMes(mes);

  const [entradas, atendimentos] = await Promise.all([
    prisma.pagamento.findMany({
      where: { pagoEm: { gte: inicio, lt: fim } },
      include: {
        agendamento: {
          // `inicio` entra para separar o que é deste mês do que veio de outro.
          select: { id: true, inicio: true, cliente: { select: { nome: true } } },
        },
      },
      orderBy: { pagoEm: "desc" },
    }),
    prisma.agendamento.findMany({
      where: { inicio: { gte: inicio, lt: fim } },
      include: {
        cliente: { select: { id: true, nome: true } },
        servico: { include: { insumos: { include: { produto: true } } } },
        movimentos: true,
        pagamentos: true,
      },
      orderBy: { inicio: "asc" },
    }),
  ]);

  /* ────────────── CAIXA: pela data do pagamento ────────────── */

  const entrou = entradas.reduce((t, p) => t + p.valorCentavos, 0);

  // De quem é esse dinheiro: do trabalho deste mês ou de festa de outro mês.
  // É a linha que explica "entrou R$ 4.101 num mês de R$ 2.000 de trabalho".
  const doProprioMes = entradas
    .filter((p) => p.agendamento.inicio >= inicio && p.agendamento.inicio < fim)
    .reduce((t, p) => t + p.valorCentavos, 0);

  const porForma = new Map<string, number>();
  for (const p of entradas) {
    porForma.set(p.forma, (porForma.get(p.forma) ?? 0) + p.valorCentavos);
  }

  /* ────────────── TRABALHO: pela data do atendimento ────────────── */

  const contas = atendimentos.map((a) => ({
    atendimento: a,
    conta: resumoFinanceiro({
      status: a.status,
      precoCentavos: a.precoCentavos,
      taxaDeslocamentoCentavos: a.taxaDeslocamentoCentavos,
      sinalCentavos: a.sinalCentavos,
      pagamentos: a.pagamentos,
      movimentos: a.movimentos,
      insumos: a.servico.insumos,
    }),
  }));

  const valem = contas.filter((c) =>
    (CONTA_COMO_TRABALHO as readonly string[]).includes(c.atendimento.status),
  );
  const concluidos = contas.filter((c) => c.atendimento.status === "CONCLUIDO");

  // Pré-agendamento é conversa: pela sua regra, só vira agendamento quando o
  // sinal é pago. Somá-lo ao total do mês seria contar como receita uma data
  // que ainda pode não acontecer — em fevereiro/27 eram R$ 360 de R$ 1.260.
  const preAgendados = contas.filter((c) => c.atendimento.status === "PRE_AGENDAMENTO");

  // Não aconteceu, mas pode ter dinheiro que ficou: cancelou, o sinal fica.
  // Mostrado à parte para a receita não desaparecer da tela do trabalho.
  const naoAconteceram = contas.filter((c) =>
    (NAO_ACONTECEU as readonly string[]).includes(c.atendimento.status),
  );

  // Produtos saíram do app por sua decisão, porque o gasto é difícil de
  // dimensionar. Então o custo deles também sai da conta do mês: do contrário o
  // valor cai sem nenhum cartão na tela para explicar o desconto.
  //
  // Os lançamentos antigos continuam no banco. Se o controle de estoque voltar,
  // o número volta a considerá-los — e aí só o custo real, nunca a estimativa:
  // o previsto de um produto que talvez não tenha sido usado não é despesa.
  const custoProdutos = ESTOQUE_ATIVO
    ? concluidos.reduce((t, c) => (c.conta.custoEhEstimativa ? t : t + c.conta.custoProdutos), 0)
    : 0;

  // Repasse de todo atendimento fechado do mês, pago ou não.
  //
  // Antes só contava se algum dinheiro já tivesse entrado, e então contava o
  // repasse inteiro. Isso dava dois erros opostos: um atendimento pago só pelo
  // sinal já descontava o repasse completo, e um ainda sem nada descontava
  // zero. Como esta conta é sobre o trabalho do mês, o que importa é que a
  // parceira fez — ou vai fazer — o serviço, e esse valor é dela.
  const repasses = valem.reduce((t, c) => t + c.atendimento.repasseCentavos, 0);

  const porServico = new Map<string, { nome: string; quantos: number; total: number }>();
  for (const c of valem) {
    const s = c.atendimento.servico;
    const atual = porServico.get(s.id) ?? { nome: s.nome, quantos: 0, total: 0 };
    atual.quantos += 1;
    atual.total += c.conta.total;
    porServico.set(s.id, atual);
  }

  const combinado = valem.reduce((t, c) => t + c.conta.total, 0);

  return {
    mes,

    /** Pela data do atendimento. Nada aqui usa data de pagamento. */
    trabalho: {
      quantos: valem.length,
      quantosConcluidos: concluidos.length,

      combinado,
      repasses,
      custoProdutos,
      /** O que o trabalho deste mês vale para você. */
      seu: combinado - repasses - custoProdutos,

      /** Dos atendimentos deste mês, quanto já entrou — em qualquer data. */
      recebido: valem.reduce((t, c) => t + c.conta.recebido, 0),
      aReceber: valem.reduce((t, c) => t + c.conta.aReceber, 0),

      porServico: [...porServico.values()].sort((a, b) => b.total - a.total),

      /* Fora da conta, mas visíveis — senão parecem ter sido esquecidos. */
      preAgendados: {
        quantos: preAgendados.length,
        valor: preAgendados.reduce((t, c) => t + c.conta.total, 0),
      },
      naoAconteceram: {
        quantos: naoAconteceram.length,
        retido: naoAconteceram.reduce((t, c) => t + c.conta.recebido, 0),
      },
    },

    /** Pela data do pagamento. Nada aqui usa data de atendimento. */
    caixa: {
      entrou,
      doProprioMes,
      deOutrosMeses: entrou - doProprioMes,
      porForma: [...porForma.entries()].sort((a, b) => b[1] - a[1]),

      // A marca vem daqui, e não da tela, porque comparar mês pelo texto da
      // data em UTC erra na virada: um atendimento às 22h de 30/09 em São Paulo
      // é 01h de 01/10 em UTC, e seria contado no mês errado. Os limites já são
      // instantes calculados a partir do fuso certo.
      entradas: entradas.map((p) => ({
        ...p,
        doMesDoRelatorio: p.agendamento.inicio >= inicio && p.agendamento.inicio < fim,
      })),
    },

    /** A lista do mês, incluindo pré-agendamento e cancelado. */
    atendimentos: contas,
  };
}

/** Histórico financeiro de uma cliente, para a tela dela. */
export async function historicoDaCliente(clienteId: string) {
  const atendimentos = await prisma.agendamento.findMany({
    where: { clienteId },
    include: {
      servico: { include: { insumos: { include: { produto: true } } } },
      movimentos: true,
      pagamentos: true,
    },
    orderBy: { inicio: "desc" },
  });

  const contas = atendimentos.map((a) => ({
    atendimento: a,
    conta: resumoFinanceiro({
      status: a.status,
      precoCentavos: a.precoCentavos,
      taxaDeslocamentoCentavos: a.taxaDeslocamentoCentavos,
      sinalCentavos: a.sinalCentavos,
      pagamentos: a.pagamentos,
      movimentos: a.movimentos,
      insumos: a.servico.insumos,
    }),
  }));

  const valem = contas.filter((c) => c.atendimento.status !== "CANCELADO");

  return {
    contas,
    quantos: valem.length,
    recebido: contas.reduce((t, c) => t + c.conta.recebido, 0),
    aReceber: valem.reduce((t, c) => t + c.conta.aReceber, 0),
  };
}
