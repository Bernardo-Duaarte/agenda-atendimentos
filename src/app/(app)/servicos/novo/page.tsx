import { prisma } from "@/lib/prisma";
import { criarServico } from "../acoes";
import { FormularioServico } from "../formulario";
import { Titulo } from "@/components/ui";
import { connection } from "next/server";
import { exigirSessao } from "@/lib/sessao";

export default async function NovoServico() {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  // Sem isto o Next pré-renderiza esta página no build e ela serve dados
  // congelados: nada aqui usa cookies/params, então ele a considera estática.
  await connection();

  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, marca: true, unidade: true },
  });

  return (
    <>
      <Titulo>Novo serviço</Titulo>
      <FormularioServico acao={criarServico} produtos={produtos} />
    </>
  );
}
