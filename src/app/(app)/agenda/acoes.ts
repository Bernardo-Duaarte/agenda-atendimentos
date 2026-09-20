"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { hora, paraUtc } from "@/lib/tempo";
import { bloqueiaHorario, descreverConflito, haSobreposicao, intervaloDeBusca } from "@/lib/agenda";
import { calcularSinal } from "@/lib/financeiro";
import { ESTOQUE_ATIVO } from "@/lib/recursos";
import {
  comValidacao,
  dinheiro,
  inteiro,
  inteiroOpcional,
  texto,
  textoOpcional,
  ErroDeCampo,
  type EstadoFormulario,
} from "@/lib/formulario";

/** Monta a janela a partir do formulário, já em UTC. */
async function lerAtendimento(fd: FormData) {
  const servicoId = texto(fd, "servicoId", "Serviço");
  const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
  if (!servico) throw new ErroDeCampo("servicoId", "Serviço não encontrado.");

  const inicio = paraUtc(texto(fd, "data", "Data"), texto(fd, "hora", "Hora"));
  const local = texto(fd, "local", "Local") as "ESTUDIO" | "DOMICILIO";
  const endereco = textoOpcional(fd, "endereco");

  if (local === "DOMICILIO" && !endereco) {
    throw new ErroDeCampo("endereco", "Atendimento em domicílio precisa de endereço.");
  }

  const precoCentavos = dinheiro(fd, "precoCentavos", "Preço");

  // O sinal nasce do percentual do serviço, mas o formulário pode trazer um
  // valor combinado à parte — daí a cópia ficar aqui e não ser recalculada
  // na leitura: mudar o percentual amanhã não reescreve o combinado ontem.
  const sinalDigitado = fd.get("sinalCentavos");
  const sinalCentavos =
    typeof sinalDigitado === "string" && sinalDigitado.trim() !== ""
      ? dinheiro(fd, "sinalCentavos", "Sinal")
      : calcularSinal(precoCentavos, servico.percentualSinal);

  if (sinalCentavos > precoCentavos) {
    throw new ErroDeCampo("sinalCentavos", "O sinal não pode ser maior que o preço.");
  }

  return {
    clienteId: texto(fd, "clienteId", "Cliente"),
    servicoId,
    inicio,
    fim: new Date(inicio.getTime() + servico.duracaoMin * 60_000),
    local,
    endereco: local === "DOMICILIO" ? endereco : null,
    deslocamentoIdaMin: inteiro(fd, "deslocamentoIdaMin", "Deslocamento de ida"),
    deslocamentoVoltaMin: inteiro(fd, "deslocamentoVoltaMin", "Deslocamento de volta"),
    taxaDeslocamentoCentavos: dinheiro(fd, "taxaDeslocamentoCentavos", "Taxa de deslocamento"),
    distanciaMetros: local === "DOMICILIO" ? inteiroOpcional(fd, "distanciaMetros") : null,
    // Cópia do preço no momento do agendamento: se a tabela mudar depois, o
    // histórico de faturamento não pode mudar junto.
    precoCentavos,
    sinalCentavos,
    observacoes: textoOpcional(fd, "observacoes"),
  };
}

/**
 * Procura choque de horário considerando o deslocamento.
 *
 * Roda dentro da mesma transação da gravação: sem isso, dois envios quase
 * simultâneos poderiam passar os dois pela verificação antes de qualquer um
 * gravar. É uma pessoa só usando, mas o toque duplo no celular existe.
 */
async function garantirHorarioLivre(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  candidato: {
    inicio: Date;
    fim: Date;
    deslocamentoIdaMin: number;
    deslocamentoVoltaMin: number;
  },
  ignorarId?: string,
) {
  const busca = intervaloDeBusca({ id: "novo", ...candidato });

  const vizinhos = await tx.agendamento.findMany({
    where: {
      id: ignorarId ? { not: ignorarId } : undefined,
      status: { not: "CANCELADO" },
      inicio: { gte: busca.de, lte: busca.ate },
    },
    include: { cliente: { select: { nome: true } } },
  });

  // Só barra o que bloqueia de verdade. Um pré-agendamento sobreposto passa e
  // aparece como aviso na tela do dia — quem pagar o sinal fica com o horário.
  const choque = vizinhos
    .filter((v) => bloqueiaHorario(v.status))
    .find((v) => haSobreposicao({ id: "novo", ...candidato }, v));

  if (choque) throw new ErroDeCampo("hora", descreverConflito(choque, hora));
}

export async function criarAtendimento(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  return comValidacao(async () => {
    const dados = await lerAtendimento(fd);

    // Pré-agendamento é o padrão: a conversa vem antes do compromisso.
    const escolhido = String(fd.get("status") ?? "");
    const status = escolhido === "PENDENTE" ? "PENDENTE" : "PRE_AGENDAMENTO";

    await prisma.$transaction(async (tx) => {
      await garantirHorarioLivre(tx, dados);
      await tx.agendamento.create({ data: { ...dados, status } });
    });

    revalidatePath("/agenda");
    redirect("/agenda");
  });
}

export async function atualizarAtendimento(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  return comValidacao(async () => {
    const id = texto(fd, "id", "Atendimento");
    const dados = await lerAtendimento(fd);

    await prisma.$transaction(async (tx) => {
      await garantirHorarioLivre(tx, dados, id);
      await tx.agendamento.update({ where: { id }, data: dados });
    });

    revalidatePath("/agenda");
    redirect(`/agenda/${id}`);
  });
}

/**
 * Conclui o atendimento e dá baixa no estoque pela ficha técnica.
 *
 * As duas coisas na mesma transação de propósito: um atendimento concluído sem
 * a baixa deixaria o estoque mentindo, e uma baixa sem a conclusão descontaria
 * produto de um atendimento que não aconteceu.
 */
export async function concluirAtendimento(fd: FormData): Promise<void> {
  await exigirSessao();
  const id = String(fd.get("id"));

  await prisma.$transaction(async (tx) => {
    const ag = await tx.agendamento.findUniqueOrThrow({
      where: { id },
      include: {
        servico: { include: { insumos: { include: { produto: true } } } },
        movimentos: true,
      },
    });

    if (ag.status === "CONCLUIDO") return; // já feito; não descontar de novo

    await tx.agendamento.update({ where: { id }, data: { status: "CONCLUIDO" } });

    // Com o estoque desligado, concluir apenas muda o status — nenhuma baixa
    // é lançada. Os movimentos antigos continuam no banco, intocados.
    if (!ESTOQUE_ATIVO) return;

    // Se já houver consumo lançado para este atendimento, não repetir.
    const jaConsumiu = ag.movimentos.some((m) => m.tipo === "CONSUMO");
    if (jaConsumiu) return;

    if (ag.servico.insumos.length > 0) {
      await tx.movimentoEstoque.createMany({
        data: ag.servico.insumos.map((i) => ({
          produtoId: i.produtoId,
          agendamentoId: ag.id,
          tipo: "CONSUMO" as const,
          // Negativa: o banco exige sinal conforme o tipo, e é isso que faz o
          // saldo poder ser uma soma simples.
          quantidade: i.quantidade.negated(),
          // Custo congelado agora, pelo mesmo motivo do preço do atendimento:
          // se o produto subir de preço no mês que vem, o lucro deste
          // atendimento não pode mudar retroativamente.
          custoTotalCentavos: Math.round(
            Number(i.quantidade) * i.produto.custoUnitarioCentavos,
          ),
          observacao: "Baixa automática pela ficha técnica",
        })),
      });
    }
  });

  revalidatePath("/agenda");
  revalidatePath("/produtos");
  redirect(`/agenda/${id}`);
}

/** Confirmar, cancelar ou marcar falta. Cancelar não mexe no estoque. */
export async function mudarStatus(fd: FormData): Promise<void> {
  await exigirSessao();

  const id = String(fd.get("id"));
  const status = String(fd.get("status")) as
    | "PRE_AGENDAMENTO"
    | "PENDENTE"
    | "CONFIRMADO"
    | "CANCELADO"
    | "FALTOU";

  await prisma.agendamento.update({ where: { id }, data: { status } });

  revalidatePath("/agenda");
  redirect(`/agenda/${id}`);
}

export async function marcarLembreteEnviado(fd: FormData): Promise<void> {
  await exigirSessao();
  const id = String(fd.get("id"));

  await prisma.agendamento.update({
    where: { id },
    data: { lembreteEnviadoEm: new Date() },
  });

  revalidatePath("/agenda");
  redirect(`/agenda/${id}`);
}

export async function excluirAtendimento(fd: FormData): Promise<void> {
  await exigirSessao();
  const id = String(fd.get("id"));

  await prisma.$transaction(async (tx) => {
    const consumo = await tx.movimentoEstoque.findMany({
      where: { agendamentoId: id, tipo: "CONSUMO" },
    });

    // Estorna em vez de apagar. O livro-razão só recebe lançamentos — é o que
    // permite responder "por que sumiu base?" meses depois. Apagar a baixa
    // corrigiria o saldo e apagaria a explicação junto.
    if (consumo.length > 0) {
      await tx.movimentoEstoque.createMany({
        data: consumo.map((m) => ({
          produtoId: m.produtoId,
          tipo: "AJUSTE" as const,
          quantidade: m.quantidade.negated(),
          observacao: "Estorno: atendimento excluído",
        })),
      });
    }

    await tx.agendamento.delete({ where: { id } });
  });

  revalidatePath("/agenda");
  revalidatePath("/produtos");
  redirect("/agenda");
}
