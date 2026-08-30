"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import {
  comValidacao,
  dataOpcional,
  telefone,
  texto,
  textoOpcional,
  type EstadoFormulario,
} from "@/lib/formulario";

function ler(fd: FormData) {
  return {
    nome: texto(fd, "nome", "Nome"),
    telefone: telefone(fd, "telefone", "Telefone"),
    email: textoOpcional(fd, "email"),
    dataNascimento: dataOpcional(fd, "dataNascimento", "Data de nascimento"),
    tomPele: textoOpcional(fd, "tomPele"),
    alergias: textoOpcional(fd, "alergias"),
    observacoes: textoOpcional(fd, "observacoes"),
    enderecoPadrao: textoOpcional(fd, "enderecoPadrao"),
  };
}

export async function criarCliente(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  return comValidacao(async () => {
    await prisma.cliente.create({ data: ler(fd) });
    revalidatePath("/clientes");
    redirect("/clientes");
  });
}

export async function atualizarCliente(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  return comValidacao(async () => {
    const id = texto(fd, "id", "Cliente");
    await prisma.cliente.update({ where: { id }, data: ler(fd) });
    revalidatePath("/clientes");
    redirect("/clientes");
  });
}

export async function excluirCliente(fd: FormData): Promise<void> {
  // Server Actions são endpoints POST de verdade: alcançáveis
  // diretamente, sem passar por página, layout ou proxy.
  await exigirSessao();

  const id = String(fd.get("id"));

  // onDelete: Restrict no schema — o banco recusa apagar quem tem histórico.
  // Melhor avisar aqui do que deixar o erro do Postgres subir como tela branca.
  const atendimentos = await prisma.agendamento.count({ where: { clienteId: id } });
  if (atendimentos > 0) {
    redirect(`/clientes?erro=${encodeURIComponent(
      "Essa cliente tem atendimentos registrados e não pode ser excluída — o histórico se perderia.",
    )}`);
  }

  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
  redirect("/clientes");
}
