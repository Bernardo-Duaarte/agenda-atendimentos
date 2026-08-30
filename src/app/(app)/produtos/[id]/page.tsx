import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarProduto, lancarMovimento } from "../acoes";
import { FormularioProduto } from "../formulario";
import { FormularioMovimento } from "../movimento";
import { Cartao, Etiqueta, Titulo } from "@/components/ui";
import { formatarReal, paraCampoReal } from "@/lib/dinheiro";
import { formatarQuantidade, saldoDoProduto } from "@/lib/estoque";
import { dataCurta, paraInputDate } from "@/lib/tempo";
import { exigirSessao } from "@/lib/sessao";

const ROTULO_TIPO = {
  ENTRADA: "Entrada",
  CONSUMO: "Consumo",
  PERDA: "Perda",
  AJUSTE: "Ajuste",
} as const;

export default async function PaginaProduto(props: PageProps<"/produtos/[id]">) {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  const { id } = await props.params;

  const [produto, saldo] = await Promise.all([
    prisma.produto.findUnique({
      where: { id },
      include: {
        movimentos: {
          orderBy: { criadoEm: "desc" },
          take: 30,
          include: { agendamento: { include: { cliente: true } } },
        },
      },
    }),
    saldoDoProduto(id),
  ]);

  if (!produto) notFound();

  const minimo = Number(produto.estoqueMinimo);
  const conteudo = Number(produto.conteudoEmbalagem);
  const precoEmbalagem = Math.round(produto.custoUnitarioCentavos * conteudo);

  return (
    <>
      <Titulo>{produto.nome}</Titulo>

      <div className="mb-6 flex flex-wrap items-center gap-x-10 gap-y-3 rounded-xl border border-borda bg-superficie px-6 py-5 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-texto-fraco">Em estoque</p>
          <p className={`text-2xl font-semibold ${saldo <= minimo ? "text-atencao" : "text-texto"}`}>
            {formatarQuantidade(saldo, produto.unidade)}
          </p>
          <p className="text-xs text-texto-fraco">
            ≈ {formatarQuantidade(conteudo > 0 ? saldo / conteudo : 0)} embalagem(ns)
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-texto-fraco">Custo por {produto.unidade}</p>
          <p className="text-2xl font-semibold text-texto">
            {formatarReal(produto.custoUnitarioCentavos)}
          </p>
          <p className="text-xs text-texto-fraco">
            {formatarReal(precoEmbalagem)} por {formatarQuantidade(conteudo, produto.unidade)}
          </p>
        </div>
        {produto.validade && (
          <div>
            <p className="text-xs uppercase tracking-wide text-texto-fraco">Validade</p>
            <p className="text-2xl font-semibold text-texto">{dataCurta(produto.validade)}</p>
          </div>
        )}
        {saldo <= minimo && <Etiqueta tom="alerta">abaixo do mínimo</Etiqueta>}
      </div>

      <div className="mb-8">
        <FormularioMovimento acao={lancarMovimento} produtoId={produto.id} unidade={produto.unidade} />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">Histórico</h2>
      {produto.movimentos.length === 0 ? (
        <p className="mb-8 rounded-xl border border-dashed border-borda bg-superficie-suave/50 px-5 py-8 text-center text-sm text-texto-fraco">
          Nenhum movimento ainda.
        </p>
      ) : (
        <Cartao className="mb-8 divide-y divide-borda-suave">
          {produto.movimentos.map((m) => {
            const qtd = Number(m.quantidade);
            return (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-texto">
                    {ROTULO_TIPO[m.tipo]}
                    {m.agendamento && ` · ${m.agendamento.cliente.nome}`}
                    {m.custoTotalCentavos !== null && ` · ${formatarReal(m.custoTotalCentavos)}`}
                  </p>
                  <p className="truncate text-xs text-texto-fraco">
                    {dataCurta(m.criadoEm)}
                    {m.observacao && ` · ${m.observacao}`}
                  </p>
                </div>
                <p className={`font-mono text-sm font-medium ${qtd < 0 ? "text-perigo" : "text-positivo"}`}>
                  {qtd > 0 ? "+" : ""}
                  {formatarQuantidade(qtd)}
                </p>
              </div>
            );
          })}
        </Cartao>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">Editar cadastro</h2>
      <FormularioProduto
        acao={atualizarProduto}
        produto={{
          id: produto.id,
          nome: produto.nome,
          marca: produto.marca,
          unidade: produto.unidade,
          conteudoEmbalagem: String(conteudo),
          precoEmbalagemReais: paraCampoReal(precoEmbalagem),
          estoqueMinimo: String(minimo),
          validade: produto.validade ? paraInputDate(produto.validade) : null,
        }}
      />
    </>
  );
}
