import "server-only";
import { prisma } from "./prisma";
import { paraInputDate, paraInputTime, paraUtc } from "./tempo";
import { haConflito } from "./agenda";
import { compromissosExternos, compromissosQueCruzam } from "./calendario-externo";
import { janelaOcupada } from "./tempo";

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
    include: { cliente: { select: { nome: true } } },
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
  const inicioDoDia = paraUtc(dataTexto, "00:00");
  const fimDoDia = new Date(inicioDoDia.getTime() + DIA_MS);

  const config = await prisma.configuracao.findUnique({
    where: { id: "unica" },
    select: { calendarioExternoUrl: true },
  });

  const [atendimentos, conflitos, externos] = await Promise.all([
    atendimentosDoDia(dataTexto),
    conflitosNoDia(dataTexto),
    compromissosExternos(config?.calendarioExternoUrl, inicioDoDia, fimDoDia),
  ]);

  // Um atendimento em cima de um compromisso pessoal: avisa, não bloqueia —
  // só você sabe se dá para remarcar o outro.
  const choquesPessoais = new Map<string, string[]>();
  if (externos.ok) {
    for (const a of atendimentos) {
      if (a.status === "CANCELADO") continue;
      const j = janelaOcupada(a);
      const cruzam = compromissosQueCruzam(externos.compromissos, j.de, j.ate);
      if (cruzam.length) choquesPessoais.set(a.id, cruzam.map((c) => c.titulo));
    }
  }
  const ativos = atendimentos.filter((a) => a.status !== "CANCELADO");

  return {
    atendimentos,
    conflitos,
    compromissosPessoais: externos.ok ? externos.compromissos : [],
    erroCalendarioPessoal: externos.ok ? null : externos.erro,
    choquesPessoais,
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

/**
 * Os atendimentos de um mês, agrupados por dia.
 *
 * O agrupamento é pela data em São Paulo, e não pela data guardada: um
 * atendimento das 22h de dia 31 está gravado como dia 1 em UTC, e cairia no
 * mês seguinte se agrupado sem converter.
 */
export async function atendimentosDoMes(mes: string) {
  const inicio = paraUtc(`${mes}-01`, "00:00");
  const [ano, m] = mes.split("-").map(Number);
  const proximo = m === 12 ? `${ano! + 1}-01-01` : `${ano}-${String(m! + 1).padStart(2, "0")}-01`;
  const fim = paraUtc(proximo, "00:00");

  const atendimentos = await prisma.agendamento.findMany({
    where: { inicio: { gte: inicio, lt: fim } },
    orderBy: { inicio: "asc" },
    include: {
      cliente: { select: { nome: true } },
      servico: { select: { nome: true } },
    },
  });

  const porDia = new Map<string, typeof atendimentos>();
  for (const a of atendimentos) {
    const dia = paraInputDate(a.inicio);
    const lista = porDia.get(dia) ?? [];
    lista.push(a);
    porDia.set(dia, lista);
  }
  return porDia;
}
