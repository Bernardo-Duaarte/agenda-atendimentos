"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { paraUtc, paraInputDate } from "@/lib/tempo";
import { bloqueioChoca } from "@/lib/agenda";
import { comValidacao, texto, textoOpcional, ErroDeCampo, type EstadoFormulario } from "@/lib/formulario";

/**
 * Bloquear um período da sua agenda.
 *
 * Antes, a única forma de proteger um horário era inventar um atendimento
 * falso — que entrava no faturamento e sujava o relatório do mês. O bloqueio
 * ocupa a agenda sem ser dinheiro nenhum.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

export async function criarBloqueio(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  return comValidacao(async () => {
    const data = texto(fd, "data", "Data");
    const diaInteiro = fd.get("diaInteiro") != null;

    let inicio: Date;
    let fim: Date;

    if (diaInteiro) {
      inicio = paraUtc(data, "00:00");
      fim = new Date(inicio.getTime() + DIA_MS);
    } else {
      const horaInicio = texto(fd, "horaInicio", "Hora de início");
      const horaFim = texto(fd, "horaFim", "Hora de fim");
      inicio = paraUtc(data, horaInicio);
      fim = paraUtc(data, horaFim);

      if (fim <= inicio) {
        throw new ErroDeCampo("horaFim", "O fim precisa ser depois do início.");
      }
    }

    // Avisar antes é melhor do que deixar a agenda em contradição silenciosa:
    // um bloqueio por cima de um atendimento marcado some da vista e ela
    // aparece no dia esperando ser atendida.
    const doDia = await prisma.agendamento.findMany({
      where: {
        inicio: { gte: new Date(inicio.getTime() - DIA_MS), lt: new Date(fim.getTime() + DIA_MS) },
        status: { notIn: ["CANCELADO", "PRE_AGENDAMENTO"] },
        profissionalId: null,
      },
      include: { cliente: { select: { nome: true } } },
    });

    const batem = doDia.filter((a) => bloqueioChoca({ inicio, fim }, a));
    if (batem.length > 0 && fd.get("mesmoAssim") == null) {
      const nomes = batem.map((a) => a.cliente.nome).join(", ");
      throw new ErroDeCampo(
        "geral",
        `Você já tem atendimento nesse período: ${nomes}. Marque "bloquear mesmo assim" se for para sobrepor.`,
      );
    }

    await prisma.bloqueio.create({
      data: { inicio, fim, diaInteiro, motivo: textoOpcional(fd, "motivo") },
    });

    revalidatePath("/agenda");
    redirect(`/agenda?d=${paraInputDate(inicio)}`);
  });
}

export async function excluirBloqueio(fd: FormData): Promise<void> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  const id = String(fd.get("id"));
  const bloqueio = await prisma.bloqueio.findUnique({ where: { id } });
  if (!bloqueio) redirect("/agenda");

  await prisma.bloqueio.delete({ where: { id } });
  revalidatePath("/agenda");
  redirect(`/agenda?d=${paraInputDate(bloqueio.inicio)}`);
}
