"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import {
  comValidacao,
  dinheiro,
  texto,
  textoOpcional,
  ErroDeCampo,
  type EstadoFormulario,
} from "@/lib/formulario";

const HORARIO = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

function horario(fd: FormData, campo: string, rotulo: string): string {
  const v = texto(fd, campo, rotulo);
  if (!HORARIO.test(v)) throw new ErroDeCampo(campo, `${rotulo} inválido. Use 09:00.`);
  return v;
}

export async function salvarConfiguracao(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  return comValidacao(async () => {
    const abertura = horario(fd, "horaAbertura", "Abertura");
    const fechamento = horario(fd, "horaFechamento", "Fechamento");
    if (fechamento <= abertura) {
      throw new ErroDeCampo("horaFechamento", "O fechamento precisa ser depois da abertura.");
    }

    // Cada dia vem como uma caixa marcada; sem nenhuma, toda marcação cairia
    // no preço diferenciado — o que quase nunca é a intenção.
    const dias = fd.getAll("diasNormais").map(String).filter((d) => /^[1-7]$/.test(d));
    if (dias.length === 0) {
      throw new ErroDeCampo("diasNormais", "Marque pelo menos um dia de trabalho.");
    }

    const dados = {
      nomeProfissional: textoOpcional(fd, "nomeProfissional") ?? "",
      telefone: textoOpcional(fd, "telefone") ?? "",
      enderecoEstudio: textoOpcional(fd, "enderecoEstudio"),
      horaAbertura: abertura,
      horaFechamento: fechamento,
      diasNormais: dias.join(","),
      calendarioExternoUrl: textoOpcional(fd, "calendarioExternoUrl"),
      taxaBaseCentavos: dinheiro(fd, "taxaBaseCentavos", "Valor base"),
      taxaPorKmCentavos: dinheiro(fd, "taxaPorKmCentavos", "Valor por km"),
      taxaPorMinutoCentavos: dinheiro(fd, "taxaPorMinutoCentavos", "Valor por minuto"),
    };

    // A linha é única e pode ainda não existir num banco novo.
    await prisma.configuracao.upsert({
      where: { id: "unica" },
      update: dados,
      create: { id: "unica", ...dados },
    });

    revalidatePath("/configuracao");
    revalidatePath("/agenda");
    redirect("/configuracao?salvo=1");
  });
}
