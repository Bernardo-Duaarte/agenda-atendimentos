import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarReal } from "@/lib/dinheiro";
import { BotaoLink, Cartao, Etiqueta, Titulo, Vazio } from "@/components/ui";
import { connection } from "next/server";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaServicos() {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  // Sem isto o Next pré-renderiza esta página no build e ela serve dados
  // congelados: nada aqui usa cookies/params, então ele a considera estática.
  await connection();

  const servicos = await prisma.servico.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: { insumos: { include: { produto: true } } },
  });

  return (
    <>
      <Titulo acao={<BotaoLink href="/servicos/novo">Novo serviço</BotaoLink>}>Serviços</Titulo>

      {servicos.length === 0 ? (
        <Vazio
          titulo="Nenhum serviço cadastrado"
          descricao="Cadastre o que você oferece, com preço e duração. É o que a agenda usa para reservar o horário certo."
          acao={<BotaoLink href="/servicos/novo">Cadastrar serviço</BotaoLink>}
        />
      ) : (
        <Cartao className="divide-y divide-borda-suave">
          {servicos.map((s) => {
            // Custo real do atendimento: o que a ficha técnica consome.
            const custo = s.insumos.reduce(
              (t, i) => t + Number(i.quantidade) * i.produto.custoUnitarioCentavos,
              0,
            );
            const margem = s.precoCentavos - custo;
            const percentual = s.precoCentavos > 0 ? Math.round((margem / s.precoCentavos) * 100) : 0;

            return (
              <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/servicos/${s.id}`} className="font-medium text-texto hover:text-marca">
                      {s.nome}
                    </Link>
                    <Etiqueta>{s.duracaoMin} min</Etiqueta>
                    {s.insumos.length === 0 && <Etiqueta tom="alerta">sem ficha técnica</Etiqueta>}
                  </div>
                  <p className="mt-0.5 text-sm text-texto-fraco">
                    {custo > 0
                      ? `Custo ${formatarReal(custo)} · sobram ${formatarReal(margem)} (${percentual}%)`
                      : "Sem produtos na ficha — o custo aparece aqui quando você preencher."}
                  </p>
                </div>

                <p className="text-lg font-semibold text-texto">{formatarReal(s.precoCentavos)}</p>
              </div>
            );
          })}
        </Cartao>
      )}
    </>
  );
}
