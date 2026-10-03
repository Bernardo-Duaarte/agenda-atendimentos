import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import {
  atualizarAtendimento,
  concluirAtendimento,
  excluirAtendimento,
  marcarLembreteEnviado,
  mudarStatus,
} from "../acoes";
import { FormularioAtendimento } from "../formulario";
import { Cartao, Etiqueta, EtiquetaStatus, Titulo } from "@/components/ui";
import { formatarReal, paraCampoReal } from "@/lib/dinheiro";
import { ROTULO_FORMA, ROTULO_TIPO_PAGAMENTO, resumoFinanceiro } from "@/lib/financeiro";
import { registrarPagamento, excluirPagamento } from "../acoes-pagamento";
import { FormularioPagamento } from "../pagamento-form";
import { momentoAgora } from "@/lib/agenda-consulta";
import { formatarQuantidade } from "@/lib/estoque";
import { dataCurta, dataLonga, hora, janelaOcupada, paraInputDate, paraInputTime } from "@/lib/tempo";
import { linkWhatsApp, mensagemLembrete } from "@/lib/whatsapp";
import { formatarDistancia } from "@/lib/deslocamento";
import { janelaComDescricao } from "@/lib/janela";
import { dentroDaJanela } from "@/lib/precificacao";
import { ESTOQUE_ATIVO } from "@/lib/recursos";

function BotaoAcao({
  children,
  destaque = false,
}: {
  children: React.ReactNode;
  destaque?: boolean;
}) {
  const estilo = destaque
    ? "bg-acao text-acao-texto hover:bg-acao-forte"
    : "border border-borda text-texto-suave hover:bg-superficie-suave";
  return (
    <button type="submit" className={`rounded-lg px-4 py-2 text-sm font-medium transition ${estilo}`}>
      {children}
    </button>
  );
}

export default async function PaginaAtendimento(props: PageProps<"/agenda/[id]">) {
  await exigirSessao();
  const { id } = await props.params;

  const [atendimento, clientes, servicos, agora, regraDePreco, profissionais, config] = await Promise.all([
    prisma.agendamento.findUnique({
      where: { id },
      include: {
        cliente: true,
        profissional: true,
        servico: { include: { insumos: { include: { produto: true } } } },
        movimentos: { include: { produto: true } },
        pagamentos: { orderBy: { pagoEm: "desc" } },
      },
    }),
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, telefone: true, enderecoPadrao: true },
    }),
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: {
        id: true, nome: true, precoCentavos: true, duracaoMin: true,
        percentualSinal: true, sinalFixoCentavos: true,
        acrescimoDomicilioCentavos: true, acrescimoForaHorarioCentavos: true,
        exigeProfissional: true,
      },
    }),
    momentoAgora(),
    janelaComDescricao(),
    prisma.profissional.findMany({
      where: { ativo: true },
      orderBy: { precoCentavos: "asc" },
      select: { id: true, nome: true, precoCentavos: true, repasseCentavos: true },
    }),
    prisma.configuracao.findUnique({ where: { id: "unica" } }),
  ]);

  if (!atendimento) notFound();

  const a = atendimento;
    const janela = janelaOcupada(a);
  const temTransito = a.deslocamentoIdaMin > 0 || a.deslocamentoVoltaMin > 0;
  const consumo = a.movimentos.filter((m) => m.tipo === "CONSUMO");
  const foraDoHorario = !dentroDaJanela(a.inicio, regraDePreco.janela);

  const conta = resumoFinanceiro({
    status: a.status,
    precoCentavos: a.precoCentavos,
    taxaDeslocamentoCentavos: a.taxaDeslocamentoCentavos,
    sinalCentavos: a.sinalCentavos,
    pagamentos: a.pagamentos,
    movimentos: a.movimentos,
    insumos: a.servico.insumos,
  });
  const total = conta.total;
  const faltaDoSinal = Math.max(0, conta.sinal - conta.sinalRecebido);

  const mensagem = mensagemLembrete(
    {
      cliente: a.cliente,
      servico: a.servico,
      inicio: a.inicio,
      local: a.local,
      endereco: a.endereco,
    },
    { enderecoEstudio: config?.enderecoEstudio },
  );

  return (
    <>
      <Titulo>{a.cliente.nome}</Titulo>

      <Cartao className="mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <EtiquetaStatus status={a.status} />
              <Etiqueta>{a.local === "DOMICILIO" ? "domicílio" : "estúdio"}</Etiqueta>
              {a.lembreteEnviadoEm && <Etiqueta tom="ok">lembrete enviado</Etiqueta>}
              {foraDoHorario && <Etiqueta tom="alerta">fora do horário</Etiqueta>}
            </div>
            <p className="text-lg font-medium capitalize text-texto">{dataLonga(a.inicio)}</p>
            <p className="text-2xl font-semibold text-texto">
              {hora(a.inicio)} – {hora(a.fim)}
            </p>
            {temTransito && (
              <p className="mt-1 text-sm text-texto-fraco">
                Com deslocamento, ocupa das {hora(janela.de)} às {hora(janela.ate)}
                {a.distanciaMetros !== null && ` · ${formatarDistancia(a.distanciaMetros)} por trecho`}
              </p>
            )}
            <p className="mt-2 text-sm text-texto-suave">
              {a.servico.nome}
              {a.profissional && ` · com ${a.profissional.nome}`}
            </p>
            {foraDoHorario && (
              <p className="mt-0.5 text-sm text-atencao-texto">
                Fora de {regraDePreco.descricao}
              </p>
            )}
            {a.endereco && <p className="mt-1 text-sm text-texto-suave">{a.endereco}</p>}
          </div>

          <div className="text-right">
            <p className="text-2xl font-semibold text-texto">{formatarReal(total)}</p>
            {a.taxaDeslocamentoCentavos > 0 && (
              <p className="text-xs text-texto-fraco">
                {formatarReal(a.precoCentavos)} + {formatarReal(a.taxaDeslocamentoCentavos)} de deslocamento
              </p>
            )}
          </div>
        </div>

        {(a.cliente.alergias || a.observacoes) && (
          <div className="mt-5 space-y-2 border-t border-borda-suave pt-4">
            {a.cliente.alergias && (
              <p className="text-sm text-atencao-texto">
                <strong>Alergias:</strong> {a.cliente.alergias}
              </p>
            )}
            {a.observacoes && <p className="text-sm text-texto-suave">{a.observacoes}</p>}
          </div>
        )}
      </Cartao>

      {/* Dinheiro: combinado, recebido, a receber e o que sobra */}
      <Cartao className="mb-6 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
          Financeiro
        </h2>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-texto-fraco">Total combinado</p>
            <p className="text-xl font-semibold text-texto">{formatarReal(conta.total)}</p>
          </div>
          <div>
            <p className="text-xs text-texto-fraco">
              {/* Com sinal fixo a porcentagem não descreve nada: o valor pode
                  ter sido ajustado à mão neste atendimento. */}
              {a.servico.sinalFixoCentavos != null ? "Sinal" : `Sinal (${a.servico.percentualSinal}%)`}
            </p>
            <p className={`text-xl font-semibold ${conta.sinalQuitado ? "text-positivo" : "text-atencao"}`}>
              {formatarReal(conta.sinal)}
            </p>
            <p className="text-xs text-texto-fraco">
              {conta.sinal === 0
                ? "sem sinal combinado"
                : conta.sinalQuitado
                  ? "pago"
                  : `faltam ${formatarReal(faltaDoSinal)}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-texto-fraco">Já recebido</p>
            <p className="text-xl font-semibold text-texto">{formatarReal(conta.recebido)}</p>
          </div>
          <div>
            <p className="text-xs text-texto-fraco">A receber</p>
            <p className={`text-xl font-semibold ${conta.aReceber > 0 ? "text-atencao" : "text-texto-fraco"}`}>
              {formatarReal(conta.aReceber)}
            </p>
            {a.status === "CANCELADO" && conta.recebido > 0 && (
              <p className="text-xs text-texto-fraco">cancelado — o sinal fica</p>
            )}
          </div>
        </div>

        {a.repasseCentavos > 0 && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-borda-suave pt-4 text-sm">
            <span className="text-texto-suave">
              Repasse a {a.profissional?.nome ?? "profissional"}:{" "}
              <strong className="text-texto">{formatarReal(a.repasseCentavos)}</strong>
            </span>
            <span className="text-texto-suave">
              Fica com você:{" "}
              <strong className={conta.recebido - a.repasseCentavos >= 0 ? "text-positivo" : "text-perigo"}>
                {formatarReal(conta.recebido - a.repasseCentavos)}
              </strong>
            </span>
          </div>
        )}

        {ESTOQUE_ATIVO && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-borda-suave pt-4 text-sm">
            <span className="text-texto-suave">
              Produtos: <strong className="text-texto">{formatarReal(conta.custoProdutos)}</strong>
              {conta.custoEhEstimativa && (
                <span className="text-texto-fraco"> (estimado pela ficha técnica)</span>
              )}
            </span>
            {!conta.custoEhEstimativa && (
              <span className="text-texto-suave">
                Sobra do que entrou:{" "}
                <strong className={conta.sobra >= 0 ? "text-positivo" : "text-perigo"}>
                  {formatarReal(conta.sobra)}
                </strong>
              </span>
            )}
          </div>
        )}
      </Cartao>

      {/* Ações do dia a dia */}
      <div className="mb-8 flex flex-wrap gap-2">
        <a
          href={linkWhatsApp(a.cliente.telefone, mensagem)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-borda px-4 py-2 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          Lembrete no WhatsApp
        </a>

        {!a.lembreteEnviadoEm && (
          <form action={marcarLembreteEnviado}>
            <input type="hidden" name="id" value={a.id} />
            <BotaoAcao>Marcar lembrete como enviado</BotaoAcao>
          </form>
        )}

        {(a.status === "PENDENTE" || a.status === "PRE_AGENDAMENTO") && (
          <form action={mudarStatus}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="status" value="CONFIRMADO" />
            {/* Atalho para quando você confirma sem sinal, por confiar na
                cliente. Com sinal, o registro do pagamento já confirma. */}
            <BotaoAcao>Confirmar sem sinal</BotaoAcao>
          </form>
        )}

        {a.status !== "CONCLUIDO" && a.status !== "CANCELADO" && (
          <form action={concluirAtendimento}>
            <input type="hidden" name="id" value={a.id} />
            <BotaoAcao destaque>
              {ESTOQUE_ATIVO ? "Concluir e dar baixa no estoque" : "Concluir atendimento"}
            </BotaoAcao>
          </form>
        )}

        {a.status !== "CANCELADO" && a.status !== "CONCLUIDO" && (
          <>
            <form action={mudarStatus}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="status" value="FALTOU" />
              <BotaoAcao>Não veio</BotaoAcao>
            </form>
            <form action={mudarStatus}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="status" value="CANCELADO" />
              <BotaoAcao>Cancelar</BotaoAcao>
            </form>
          </>
        )}
      </div>

      {/* Recebimentos */}
      {a.pagamentos.length > 0 && (
        <Cartao className="mb-6 divide-y divide-borda-suave">
          {a.pagamentos.map((pg) => {
            const devolucao = pg.valorCentavos < 0;
            return (
              <div key={pg.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-texto">
                    {ROTULO_TIPO_PAGAMENTO[pg.tipo]}
                    <span className="font-normal text-texto-fraco">
                      {" "}· {ROTULO_FORMA[pg.forma]} · {dataCurta(pg.pagoEm)}
                    </span>
                  </p>
                  {pg.observacao && (
                    <p className="truncate text-xs text-texto-fraco">{pg.observacao}</p>
                  )}
                </div>
                <p className={`font-mono text-sm font-medium ${devolucao ? "text-perigo" : "text-positivo"}`}>
                  {devolucao ? "" : "+"}
                  {formatarReal(pg.valorCentavos)}
                </p>
                <form action={excluirPagamento}>
                  <input type="hidden" name="id" value={pg.id} />
                  <button
                    type="submit"
                    className="text-xs text-texto-fraco underline underline-offset-2 transition hover:text-perigo"
                    title="Apagar este lançamento"
                  >
                    apagar
                  </button>
                </form>
              </div>
            );
          })}
        </Cartao>
      )}

      <div className="mb-8">
        <FormularioPagamento
          acao={registrarPagamento}
          agendamentoId={a.id}
          sinalSugerido={faltaDoSinal > 0 ? paraCampoReal(faltaDoSinal) : ""}
          restanteSugerido={conta.aReceber > 0 ? paraCampoReal(conta.aReceber) : ""}
          hoje={agora.data}
          agora={agora.hora}
        />
      </div>

      {ESTOQUE_ATIVO && (
        <>
      {/* O que saiu do estoque */}
      {consumo.length > 0 ? (
        <Cartao className="mb-8 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            Produtos consumidos
          </h2>
          <ul className="space-y-1.5 text-sm">
            {consumo.map((m) => (
              <li key={m.id} className="flex justify-between">
                <Link href={`/produtos/${m.produtoId}`} className="text-texto-suave hover:text-marca">
                  {m.produto.nome}
                </Link>
                <span className="font-mono text-texto-fraco">
                  {formatarQuantidade(Math.abs(Number(m.quantidade)), m.produto.unidade)}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      ) : (
        a.servico.insumos.length > 0 &&
        a.status !== "CONCLUIDO" && (
          <Cartao className="mb-8 p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
              Vai sair do estoque ao concluir
            </h2>
            <p className="mb-3 text-sm text-texto-fraco">Conforme a ficha técnica do serviço.</p>
            <ul className="space-y-1.5 text-sm">
              {a.servico.insumos.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span className="text-texto-suave">{i.produto.nome}</span>
                  <span className="font-mono text-texto-fraco">
                    {formatarQuantidade(Number(i.quantidade), i.produto.unidade)}
                  </span>
                </li>
              ))}
            </ul>
          </Cartao>
        )
      )}
        </>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">Editar</h2>
      <FormularioAtendimento
        acao={atualizarAtendimento}
        profissionais={profissionais}
        janela={regraDePreco.janela}
        descricaoJanela={regraDePreco.descricao}
        clientes={clientes}
        servicos={servicos.map((s) => ({
          id: s.id,
          nome: s.nome,
          duracaoMin: s.duracaoMin,
          percentualSinal: s.percentualSinal,
          sinalFixoCentavos: s.sinalFixoCentavos,
          precoCentavos: s.precoCentavos,
          acrescimoDomicilioCentavos: s.acrescimoDomicilioCentavos,
          acrescimoForaHorarioCentavos: s.acrescimoForaHorarioCentavos,
          exigeProfissional: s.exigeProfissional,
        }))}
        atendimento={{
          id: a.id,
          clienteId: a.clienteId,
          servicoId: a.servicoId,
          data: paraInputDate(a.inicio),
          hora: paraInputTime(a.inicio),
          local: a.local,
          endereco: a.endereco,
          deslocamentoIdaMin: a.deslocamentoIdaMin,
          deslocamentoVoltaMin: a.deslocamentoVoltaMin,
          taxaReais: paraCampoReal(a.taxaDeslocamentoCentavos),
          precoReais: paraCampoReal(a.precoCentavos),
          sinalReais: paraCampoReal(a.sinalCentavos),
          distanciaMetros: a.distanciaMetros,
          profissionalId: a.profissionalId,
          observacoes: a.observacoes,
        }}
      />

      <form action={excluirAtendimento} className="mt-10 border-t border-borda pt-6">
        <input type="hidden" name="id" value={a.id} />
        <button
          type="submit"
          className="text-sm font-medium text-texto-fraco underline underline-offset-4 transition hover:text-perigo"
        >
          Excluir este atendimento
        </button>
        <p className="mt-1 text-xs text-texto-fraco">
          Apaga o registro e estorna no estoque o que tiver sido descontado — a baixa e o estorno
          ficam no histórico do produto. Para manter o atendimento no histórico, prefira cancelar.
        </p>
      </form>
    </>
  );
}
