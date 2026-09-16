"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { paraUtc } from "@/lib/tempo";
import {
  comValidacao,
  dinheiro,
  texto,
  textoOpcional,
  ErroDeCampo,
  type EstadoFormulario,
} from "@/lib/formulario";

const TIPOS = ["SINAL", "RESTANTE", "EXTRA", "DEVOLUCAO"] as const;
const FORMAS = ["PIX", "DINHEIRO", "CARTAO", "TRANSFERENCIA"] as const;

type Tipo = (typeof TIPOS)[number];
type Forma = (typeof FORMAS)[number];

/**
 * Registra um recebimento.
 *
 * Quando o sinal fica coberto, o atendimento passa a CONFIRMADO sozinho —
 * é essa a regra: o sinal é o que garante o horário. A promoção só acontece
 * a partir de pré-agendamento ou aguardando sinal; um atendimento já
 * concluído ou cancelado não volta atrás por causa de um lançamento.
 */
export async function registrarPagamento(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  return comValidacao(async () => {
    const agendamentoId = texto(fd, "agendamentoId", "Atendimento");
    const tipo = texto(fd, "tipo", "Tipo") as Tipo;
    const forma = texto(fd, "forma", "Forma") as Forma;

    if (!TIPOS.includes(tipo)) throw new ErroDeCampo("tipo", "Tipo de pagamento inválido.");
    if (!FORMAS.includes(forma)) throw new ErroDeCampo("forma", "Forma de pagamento inválida.");

    const valor = dinheiro(fd, "valorCentavos", "Valor");
    if (valor === 0) throw new ErroDeCampo("valorCentavos", "O valor não pode ser zero.");

    // O banco exige o sinal conforme o tipo; aqui a conversão é explícita para
    // a pessoa digitar sempre um número positivo, inclusive na devolução.
    const valorCentavos = tipo === "DEVOLUCAO" ? -valor : valor;

    const pagoEm = paraUtc(texto(fd, "data", "Data"), texto(fd, "hora", "Hora"));

    await prisma.$transaction(async (tx) => {
      await tx.pagamento.create({
        data: {
          agendamentoId,
          tipo,
          forma,
          valorCentavos,
          pagoEm,
          observacao: textoOpcional(fd, "observacao"),
        },
      });

      const ag = await tx.agendamento.findUniqueOrThrow({
        where: { id: agendamentoId },
        include: { pagamentos: true },
      });

      const podeConfirmar = ag.status === "PRE_AGENDAMENTO" || ag.status === "PENDENTE";
      if (!podeConfirmar) return;

      const sinalRecebido = ag.pagamentos
        .filter((p) => p.tipo === "SINAL" || p.tipo === "DEVOLUCAO")
        .reduce((t, p) => t + p.valorCentavos, 0);

      if (ag.sinalCentavos > 0 && sinalRecebido >= ag.sinalCentavos) {
        await tx.agendamento.update({
          where: { id: agendamentoId },
          data: { status: "CONFIRMADO" },
        });
      }
    });

    revalidatePath("/agenda");
    revalidatePath(`/agenda/${agendamentoId}`);
    redirect(`/agenda/${agendamentoId}`);
  });
}

/**
 * Apaga um lançamento errado.
 *
 * De propósito NÃO rebaixa o status de volta. Você pode ter confirmado um
 * horário sem sinal, por confiar na cliente, e um acerto de lançamento não
 * deve desfazer essa decisão. Se precisar, o status muda pelos botões.
 */
export async function excluirPagamento(fd: FormData): Promise<void> {
  await exigirSessao();

  const id = String(fd.get("id"));
  const pagamento = await prisma.pagamento.delete({ where: { id } });

  revalidatePath("/agenda");
  redirect(`/agenda/${pagamento.agendamentoId}`);
}
