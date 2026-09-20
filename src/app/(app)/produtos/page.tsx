import Link from "next/link";
import { formatarReal } from "@/lib/dinheiro";
import { formatarQuantidade, produtosComEstoque } from "@/lib/estoque";
import { dataCurta } from "@/lib/tempo";
import { BotaoLink, Cartao, Etiqueta, Titulo, Vazio } from "@/components/ui";
import { connection } from "next/server";
import { exigirSessao } from "@/lib/sessao";
import { ESTOQUE_ATIVO } from "@/lib/recursos";
import { redirect } from "next/navigation";

export default async function PaginaProdutos() {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();
  // Endereço guardado nos favoritos não deve abrir uma tela que saiu do app.
  if (!ESTOQUE_ATIVO) redirect("/");

  // Sem isto o Next pré-renderiza esta página no build e ela serve dados
  // congelados: nada aqui usa cookies/params, então ele a considera estática.
  await connection();

  const produtos = await produtosComEstoque();

  return (
    <>
      <Titulo acao={<BotaoLink href="/produtos/novo">Novo produto</BotaoLink>}>Produtos</Titulo>

      {produtos.length === 0 ? (
        <Vazio
          titulo="Nenhum produto cadastrado"
          descricao="Cadastre o que você usa nos atendimentos. É a partir daqui que a ficha técnica dá baixa sozinha no estoque."
          acao={<BotaoLink href="/produtos/novo">Cadastrar produto</BotaoLink>}
        />
      ) : (
        <Cartao className="divide-y divide-borda-suave">
          {produtos.map(({ saldo, minimo, repor, vencendo, ...p }) => {
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/produtos/${p.id}`} className="font-medium text-texto hover:text-marca">
                      {p.nome}
                    </Link>
                    {p.marca && <span className="text-sm text-texto-fraco">{p.marca}</span>}
                    {repor && <Etiqueta tom="alerta">repor</Etiqueta>}
                    {vencendo && (
                      <Etiqueta tom="alerta">vence {dataCurta(p.validade!)}</Etiqueta>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-texto-fraco">
                    {formatarReal(p.custoUnitarioCentavos)} por {p.unidade}
                    {minimo > 0 && ` · mínimo ${formatarQuantidade(minimo, p.unidade)}`}
                  </p>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-semibold ${repor ? "text-atencao" : "text-texto"}`}>
                    {formatarQuantidade(saldo)}
                  </p>
                  <p className="text-xs text-texto-fraco">{p.unidade} em estoque</p>
                </div>
              </div>
            );
          })}
        </Cartao>
      )}
    </>
  );
}
