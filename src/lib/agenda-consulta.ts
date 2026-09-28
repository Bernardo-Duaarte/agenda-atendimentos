import "server-only";
import { prisma } from "./prisma";
import { paraInputDate, paraInputTime, paraUtc } from "./tempo";
import { haConflito } from "./agenda";

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

/**
 * Quem choca com quem no dia.
 *
 * Existe porque pré-agendamento não bloqueia: duas clientes podem estar
 * negociando o mesmo sábado, e você precisa ver isso na tela em vez de
 * descobrir depois. Busca um dia para cada lado porque o deslocamento pode
 * empurrar a janela de um atendimento para fora do dia dele.
 */
async function conflitosNoDia(dataTexto: string): Promise<Map<string, string[]>> {
  const inicio = paraUtc(deslocarDia(dataTexto, -1), "00:00");
  const fim = new Date(paraUtc(deslocarDia(dataTexto, 1), "00:00").getTime() + DIA_MS);

  const vizinhanca = await prisma.agendamento.findMany({
    where: { inicio: { gte: inicio, lt: fim }, status: { not: "CANCELADO" } },
    include: {
      cliente: { select: { nome: true } },
      servico: { select: { ocupaMaquiadora: true, ocupaPenteadista: true } },
    },
  });

  const mapa = new Map<string, string[]>();
  for (const a of vizinhanca) {
    const choques = vizinhanca
      .filter((b) => b.id !== a.id && haConflito(a, b))
      .map((b) => b.cliente.nome);
    if (choques.length) mapa.set(a.id, choques);
  }
  return mapa;
}

/** Quantos atendimentos há em cada dia, para marcar os dias cheios na navegação. */
export async function resumoDoDia(dataTexto: string) {
  const [atendimentos, conflitos] = await Promise.all([
    atendimentosDoDia(dataTexto),
    conflitosNoDia(dataTexto),
  ]);
  const ativos = atendimentos.filter((a) => a.status !== "CANCELADO");

  return {
    atendimentos,
    conflitos,
    total: ativos.length,
    faturamento: ativos
      .filter((a) => a.status === "CONCLUIDO")
      .reduce((t, a) => t + a.precoCentavos + a.taxaDeslocamentoCentavos, 0),
    previsto: ativos.reduce((t, a) => t + a.precoCentavos + a.taxaDeslocamentoCentavos, 0),
  };
}

/**
 * Data e hora de agora, para preencher formulários.
 *
 * É uma função de dados e não um valor lido no componente porque depende do
 * relógio: ler a hora durante a renderização é impuro — o React pode
 * renderizar de novo e obter outro valor.
 */
export async function momentoAgora(): Promise<{ data: string; hora: string }> {
  const d = new Date();
  return { data: paraInputDate(d), hora: paraInputTime(d) };
}
