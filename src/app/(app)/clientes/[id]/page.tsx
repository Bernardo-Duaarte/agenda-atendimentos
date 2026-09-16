import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { atualizarCliente, excluirCliente } from "../acoes";
import { FormularioCliente } from "../formulario";
import { Cartao, EtiquetaStatus, Titulo } from "@/components/ui";
import { historicoDaCliente } from "@/lib/relatorio";
import { formatarReal } from "@/lib/dinheiro";
import { dataCurta, hora } from "@/lib/tempo";
import Link from "next/link";
import { paraInputDate } from "@/lib/tempo";
import { exigirSessao } from "@/lib/sessao";

export default async function EditarCliente(props: PageProps<"/clientes/[id]">) {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  const { id } = await props.params;
  const [cliente, historico] = await Promise.all([
    prisma.cliente.findUnique({ where: { id } }),
    historicoDaCliente(id),
  ]);
  if (!cliente) notFound();

  return (
    <>
      <Titulo>{cliente.nome}</Titulo>

      {historico.contas.length > 0 && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Cartao className="p-5">
              <p className="text-sm font-medium text-texto-suave">Atendimentos</p>
              <p className="mt-1 text-2xl font-semibold text-texto">{historico.quantos}</p>
            </Cartao>
            <Cartao className="p-5">
              <p className="text-sm font-medium text-texto-suave">Já pagou</p>
              <p className="mt-1 text-2xl font-semibold text-positivo">
                {formatarReal(historico.recebido)}
              </p>
            </Cartao>
            <Cartao className="p-5">
              <p className="text-sm font-medium text-texto-suave">Em aberto</p>
              <p className={`mt-1 text-2xl font-semibold ${historico.aReceber > 0 ? "text-atencao" : "text-texto-fraco"}`}>
                {formatarReal(historico.aReceber)}
              </p>
            </Cartao>
          </div>

          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            Histórico
          </h2>
          <Cartao className="mb-8 divide-y divide-borda-suave">
            {historico.contas.map(({ atendimento: a, conta }) => (
              <Link
                key={a.id}
                href={`/agenda/${a.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition hover:bg-superficie-suave"
              >
                <span className="w-24 shrink-0 font-mono text-xs text-texto-fraco">
                  {dataCurta(a.inicio)} {hora(a.inicio)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-texto">{a.servico.nome}</span>
                <EtiquetaStatus status={a.status} />
                <span className="w-24 shrink-0 text-right text-sm">
                  <span className="font-medium text-texto">{formatarReal(conta.recebido)}</span>
                  {conta.aReceber > 0 && (
                    <span className="block text-xs text-atencao">
                      falta {formatarReal(conta.aReceber)}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </Cartao>
        </>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
        Cadastro
      </h2>
      <FormularioCliente
        acao={atualizarCliente}
        cliente={{
          ...cliente,
          // Date -> "yyyy-MM-dd" para o <input type="date">
          dataNascimento: cliente.dataNascimento ? paraInputDate(cliente.dataNascimento) : null,
        }}
      />

      <form action={excluirCliente} className="mt-10 border-t border-borda pt-6">
        <input type="hidden" name="id" value={cliente.id} />
        <button
          type="submit"
          className="text-sm font-medium text-texto-fraco underline underline-offset-4 transition hover:text-perigo"
        >
          Excluir esta cliente
        </button>
        <p className="mt-1 text-xs text-texto-fraco">
          Só é possível excluir quem ainda não tem atendimento registrado.
        </p>
      </form>
    </>
  );
}
