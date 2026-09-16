"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AreaTexto, Aviso, Campo, Cartao, Entrada } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

export type ProdutoDisponivel = {
  id: string;
  nome: string;
  marca: string | null;
  unidade: string;
};

export type ServicoEmEdicao = {
  id: string;
  nome: string;
  descricao: string | null;
  precoReais: string;
  duracaoMin: number;
  percentualSinal: number;
  /** produtoId -> quantidade já cadastrada, como texto de campo */
  ficha: Record<string, string>;
};

export function FormularioServico({
  acao,
  produtos,
  servico,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  produtos: ProdutoDisponivel[];
  servico?: ServicoEmEdicao;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const erro = (campo: string) => estado.erros?.[campo];

  return (
    <form action={enviar} className="space-y-6">
      {servico && <input type="hidden" name="id" value={servico.id} />}
      {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}

      <Cartao className="space-y-5 p-6">
        <Campo rotulo="Nome" erro={erro("nome")}>
          <Entrada name="nome" defaultValue={servico?.nome} erro={!!erro("nome")} autoFocus placeholder="Maquiagem social" />
        </Campo>

        <Campo rotulo="Descrição" erro={erro("descricao")} dica="Opcional. O que está incluído.">
          <AreaTexto name="descricao" defaultValue={servico?.descricao ?? ""} placeholder="Pele, olhos e boca. Inclui cílios postiços." />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-3">
          <Campo rotulo="Preço" erro={erro("precoCentavos")}>
            <Entrada
              name="precoCentavos"
              defaultValue={servico?.precoReais}
              erro={!!erro("precoCentavos")}
              inputMode="decimal"
              placeholder="150,00"
            />
          </Campo>

          <Campo
            rotulo="Sinal (%)"
            erro={erro("percentualSinal")}
            dica="Quanto se pede adiantado para garantir o horário."
          >
            <Entrada
              name="percentualSinal"
              defaultValue={servico?.percentualSinal ?? 30}
              erro={!!erro("percentualSinal")}
              inputMode="numeric"
              placeholder="30"
            />
          </Campo>

          <Campo
            rotulo="Duração (minutos)"
            erro={erro("duracaoMin")}
            dica="É o que reserva o espaço na agenda."
          >
            <Entrada
              name="duracaoMin"
              defaultValue={servico?.duracaoMin ?? 60}
              erro={!!erro("duracaoMin")}
              inputMode="numeric"
              placeholder="60"
            />
          </Campo>
        </div>
      </Cartao>

      <Cartao className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-fraco">Ficha técnica</h2>
        <p className="mt-1 mb-5 text-sm text-texto-fraco">
          Quanto de cada produto esse serviço gasta, em média. É isso que dá baixa no estoque
          quando você conclui um atendimento — deixe em branco o que não usa.
        </p>

        {produtos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-borda bg-superficie-suave px-4 py-6 text-center text-sm text-texto-fraco">
            Você ainda não tem produtos cadastrados.{" "}
            <Link href="/produtos/novo" className="font-medium text-marca underline underline-offset-2">
              Cadastre um
            </Link>{" "}
            e ele aparece aqui. Dá para deixar para depois.
          </p>
        ) : (
          <div className="divide-y divide-borda-suave">
            {produtos.map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">{p.nome}</p>
                  {p.marca && <p className="truncate text-xs text-texto-fraco">{p.marca}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Entrada
                    name={`insumo_${p.id}`}
                    defaultValue={servico?.ficha[p.id] ?? ""}
                    erro={!!erro(`insumo_${p.id}`)}
                    inputMode="decimal"
                    placeholder="0"
                    className="w-24 text-right"
                    aria-label={`Quantidade de ${p.nome}`}
                  />
                  <span className="w-16 text-xs text-texto-fraco">{p.unidade}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Cartao>

      <div className="flex items-center gap-3">
        <BotaoSubmit>{servico ? "Salvar alterações" : "Cadastrar serviço"}</BotaoSubmit>
        <Link href="/servicos" className="text-sm font-medium text-texto-suave hover:text-texto">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
