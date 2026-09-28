import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarServico, excluirServico } from "../acoes";
import { FormularioServico } from "../formulario";
import { Titulo } from "@/components/ui";
import { janelaComDescricao } from "@/lib/janela";
import { paraCampoReal } from "@/lib/dinheiro";
import { exigirSessao } from "@/lib/sessao";

export default async function EditarServico(props: PageProps<"/servicos/[id]">) {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  const { id } = await props.params;

  const [servico, produtos, { descricao }] = await Promise.all([
    prisma.servico.findUnique({ where: { id }, include: { insumos: true } }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, marca: true, unidade: true },
    }),
    janelaComDescricao(),
  ]);

  if (!servico) notFound();

  const ficha = Object.fromEntries(
    servico.insumos.map((i) => [i.produtoId, String(Number(i.quantidade))]),
  );

  return (
    <>
      <Titulo>{servico.nome}</Titulo>

      <FormularioServico
        descricaoJanela={descricao}
        acao={atualizarServico}
        produtos={produtos}
        servico={{
          id: servico.id,
          nome: servico.nome,
          descricao: servico.descricao,
          precoReais: paraCampoReal(servico.precoCentavos),
          duracaoMin: servico.duracaoMin,
          percentualSinal: servico.percentualSinal,
          exigeProfissional: servico.exigeProfissional,
          acrescimoDomicilioReais: paraCampoReal(servico.acrescimoDomicilioCentavos),
          acrescimoForaHorarioReais: paraCampoReal(servico.acrescimoForaHorarioCentavos),
          ficha,
        }}
      />

      <form action={excluirServico} className="mt-10 border-t border-borda pt-6">
        <input type="hidden" name="id" value={servico.id} />
        <button
          type="submit"
          className="text-sm font-medium text-texto-fraco underline underline-offset-4 transition hover:text-perigo"
        >
          Remover este serviço
        </button>
        <p className="mt-1 text-xs text-texto-fraco">
          Se já foi usado em algum atendimento, ele sai da lista mas continua no histórico.
        </p>
      </form>
    </>
  );
}
