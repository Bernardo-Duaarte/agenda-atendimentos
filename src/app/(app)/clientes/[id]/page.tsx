import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarCliente, excluirCliente } from "../acoes";
import { FormularioCliente } from "../formulario";
import { Titulo } from "@/components/ui";
import { paraInputDate } from "@/lib/tempo";
import { exigirSessao } from "@/lib/sessao";

export default async function EditarCliente(props: PageProps<"/clientes/[id]">) {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  const { id } = await props.params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) notFound();

  return (
    <>
      <Titulo>{cliente.nome}</Titulo>

      <FormularioCliente
        acao={atualizarCliente}
        cliente={{
          ...cliente,
          // Date -> "yyyy-MM-dd" para o <input type="date">
          dataNascimento: cliente.dataNascimento ? paraInputDate(cliente.dataNascimento) : null,
        }}
      />

      <form action={excluirCliente} className="mt-10 border-t border-zinc-200 pt-6">
        <input type="hidden" name="id" value={cliente.id} />
        <button
          type="submit"
          className="text-sm font-medium text-zinc-500 underline underline-offset-4 transition hover:text-rose-600"
        >
          Excluir esta cliente
        </button>
        <p className="mt-1 text-xs text-zinc-400">
          Só é possível excluir quem ainda não tem atendimento registrado.
        </p>
      </form>
    </>
  );
}
