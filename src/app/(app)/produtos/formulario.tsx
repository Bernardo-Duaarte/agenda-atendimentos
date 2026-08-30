"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Aviso, Campo, Cartao, Entrada, Selecao } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

export type ProdutoEmEdicao = {
  id: string;
  nome: string;
  marca: string | null;
  unidade: string;
  conteudoEmbalagem: string;
  precoEmbalagemReais: string;
  estoqueMinimo: string;
  validade: string | null;
};

const UNIDADES = [
  { valor: "ml", rotulo: "ml — mililitro (base, primer, fixador)" },
  { valor: "g", rotulo: "g — grama (pó, corretivo em pote)" },
  { valor: "un", rotulo: "un — unidade (par de cílios, esponja)" },
  { valor: "aplicacao", rotulo: "aplicação — quando é mais fácil contar usos" },
];

export function FormularioProduto({
  acao,
  produto,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  produto?: ProdutoEmEdicao;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const [unidade, setUnidade] = useState(produto?.unidade ?? "ml");
  const erro = (campo: string) => estado.erros?.[campo];

  return (
    <form action={enviar} className="space-y-6">
      {produto && <input type="hidden" name="id" value={produto.id} />}
      {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}

      <Cartao className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Nome" erro={erro("nome")}>
            <Entrada name="nome" defaultValue={produto?.nome} erro={!!erro("nome")} autoFocus placeholder="Base líquida" />
          </Campo>

          <Campo rotulo="Marca" erro={erro("marca")} dica="Opcional.">
            <Entrada name="marca" defaultValue={produto?.marca ?? ""} placeholder="Ex: Mac" />
          </Campo>
        </div>

        <Campo
          rotulo="Unidade de consumo"
          erro={erro("unidade")}
          dica="É nesta unidade que a ficha técnica desconta do estoque."
        >
          <Selecao name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)}>
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
      </Cartao>

      <Cartao className="space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Como você compra</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Preencha do jeito que está na embalagem. O custo de cada {unidade} sai da divisão — é
            esse número que diz quanto de produto vai embora em cada atendimento.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo={`Quanto vem na embalagem (${unidade})`}
            erro={erro("conteudoEmbalagem")}
            dica="Ex: um frasco de base de 35 ml."
          >
            <Entrada
              name="conteudoEmbalagem"
              defaultValue={produto?.conteudoEmbalagem}
              erro={!!erro("conteudoEmbalagem")}
              inputMode="decimal"
              placeholder="35"
            />
          </Campo>

          <Campo rotulo="Quanto custa a embalagem" erro={erro("precoEmbalagem")} dica="O valor que você paga por ela.">
            <Entrada
              name="precoEmbalagem"
              defaultValue={produto?.precoEmbalagemReais}
              erro={!!erro("precoEmbalagem")}
              inputMode="decimal"
              placeholder="229,00"
            />
          </Campo>
        </div>
      </Cartao>

      <Cartao className="space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo={`Estoque mínimo (${unidade})`}
            erro={erro("estoqueMinimo")}
            dica="Abaixo disso o produto aparece marcado como 'repor'."
          >
            <Entrada
              name="estoqueMinimo"
              defaultValue={produto?.estoqueMinimo ?? "0"}
              erro={!!erro("estoqueMinimo")}
              inputMode="decimal"
              placeholder="20"
            />
          </Campo>

          <Campo rotulo="Validade" erro={erro("validade")} dica="Opcional. Avisa 30 dias antes.">
            <Entrada type="date" name="validade" defaultValue={produto?.validade ?? ""} />
          </Campo>
        </div>

        {!produto && (
          <Campo
            rotulo={`Quanto você já tem hoje (${unidade})`}
            erro={erro("estoqueInicial")}
            dica="Vira a primeira entrada do histórico. Pode deixar 0 e lançar depois."
          >
            <Entrada name="estoqueInicial" defaultValue="0" erro={!!erro("estoqueInicial")} inputMode="decimal" />
          </Campo>
        )}
      </Cartao>

      <div className="flex items-center gap-3">
        <BotaoSubmit>{produto ? "Salvar alterações" : "Cadastrar produto"}</BotaoSubmit>
        <Link href="/produtos" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
