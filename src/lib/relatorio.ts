import "server-only";
import { prisma } from "./prisma";
import { paraUtc } from "./tempo";
import { resumoFinanceiro } from "./financeiro";

/**
 * Relatório do mês.
 *
 * Duas contas diferentes convivem aqui de propósito, porque respondem a
 * perguntas diferentes:
 *
 *   ENTRADAS  — pela data do pagamento. "Quanto dinheiro entrou em setembro?"
 *               Um sinal recebido em agosto de um casamento em outubro conta
 *               em agosto, que é quando ele apareceu na conta.
 *
 *   ATENDIMENTOS — pela data do atendimento. "Quanto trabalhei em setembro,
 *               quanto disso já recebi e quanto ainda vou receber?"
 *
 * Misturar as duas é o jeito clássico de um relatório mentir.
 */

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
      include: { agendamento: { include: { cliente: { select: { nome: true } } } } },
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

  const recebidoNoMes = entradas.reduce((t, p) => t + p.valorCentavos, 0);

  const porForma = new Map<string, number>();
  for (const p of entradas) {
    porForma.set(p.forma, (porForma.get(p.forma) ?? 0) + p.valorCentavos);
  }

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
  const concluidos = contas.filter((c) => c.atendimento.status === "CONCLUIDO");

  // Só custo de atendimento que aconteceu: o estimado de um que ainda não
  // ocorreu não é despesa, é previsão.
  const custoProdutos = concluidos.reduce((t, c) => t + c.conta.custoProdutos, 0);

  const porServico = new Map<string, { nome: string; quantos: number; total: number }>();
  for (const c of valem) {
    const s = c.atendimento.servico;
    const atual = porServico.get(s.id) ?? { nome: s.nome, quantos: 0, total: 0 };
    atual.quantos += 1;
    atual.total += c.conta.total;
    porServico.set(s.id, atual);
  }

  return {
    mes,
    entradas,
    recebidoNoMes,
    porForma: [...porForma.entries()].sort((a, b) => b[1] - a[1]),

    atendimentos: contas,
    quantos: valem.length,
    quantosConcluidos: concluidos.length,
    quantosCancelados: contas.length - valem.length,

    combinado: valem.reduce((t, c) => t + c.conta.total, 0),
    aReceber: valem.reduce((t, c) => t + c.conta.aReceber, 0),
    custoProdutos,
    /** O que sobrou do dinheiro que entrou, depois dos produtos usados. */
    sobra: recebidoNoMes - custoProdutos,

    porServico: [...porServico.values()].sort((a, b) => b.total - a.total),
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
