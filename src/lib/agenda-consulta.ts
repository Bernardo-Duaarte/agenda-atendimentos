import "server-only";
import { prisma } from "./prisma";
import { paraInputDate, paraUtc } from "./tempo";

/**
 * Consultas da agenda.
 *
 * "Hoje" mora aqui, e não no componente, porque depende do relógio: ler a hora
 * durante a renderização é impuro — o React pode renderizar de novo e obter
 * outro dia. Buscar dados é o lugar certo para isso.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

export function hojeEmSaoPaulo(): string {
  return paraInputDate(new Date());
}

/** Move um dia para frente ou para trás, sem cair em armadilha de fuso. */
export function deslocarDia(dataTexto: string, dias: number): string {
  // Meio-dia UTC: longe o bastante das bordas para nenhum fuso empurrar o dia.
  const d = new Date(`${dataTexto}T12:00:00Z`);
  return new Date(d.getTime() + dias * DIA_MS).toISOString().slice(0, 10);
}

export async function atendimentosDoDia(dataTexto: string) {
  const inicioDoDia = paraUtc(dataTexto, "00:00");
  const fimDoDia = new Date(inicioDoDia.getTime() + DIA_MS);

  return prisma.agendamento.findMany({
    where: { inicio: { gte: inicioDoDia, lt: fimDoDia } },
    orderBy: { inicio: "asc" },
    include: { cliente: true, servico: true },
  });
}

/** Os próximos atendimentos, para a tela inicial. */
export async function proximosAtendimentos(quantos = 5) {
  return prisma.agendamento.findMany({
    where: { inicio: { gte: new Date() }, status: { notIn: ["CANCELADO", "CONCLUIDO"] } },
    orderBy: { inicio: "asc" },
    take: quantos,
    include: { cliente: true, servico: true },
  });
}

/** Quantos atendimentos há em cada dia, para marcar os dias cheios na navegação. */
export async function resumoDoDia(dataTexto: string) {
  const atendimentos = await atendimentosDoDia(dataTexto);
  const ativos = atendimentos.filter((a) => a.status !== "CANCELADO");

  return {
    atendimentos,
    total: ativos.length,
    faturamento: ativos
      .filter((a) => a.status === "CONCLUIDO")
      .reduce((t, a) => t + a.precoCentavos + a.taxaDeslocamentoCentavos, 0),
    previsto: ativos.reduce((t, a) => t + a.precoCentavos + a.taxaDeslocamentoCentavos, 0),
  };
}
