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
import { Cartao, Etiqueta, Titulo } from "@/components/ui";
import { formatarReal, paraCampoReal } from "@/lib/dinheiro";
import { formatarQuantidade } from "@/lib/estoque";
import { dataLonga, hora, janelaOcupada, paraInputDate, paraInputTime } from "@/lib/tempo";
import { linkWhatsApp, mensagemLembrete } from "@/lib/whatsapp";

const APARENCIA = {
  PENDENTE: { rotulo: "a confirmar", tom: "alerta" },
  CONFIRMADO: { rotulo: "confirmado", tom: "ok" },
  CONCLUIDO: { rotulo: "concluído", tom: "neutro" },
  CANCELADO: { rotulo: "cancelado", tom: "neutro" },
  FALTOU: { rotulo: "não veio", tom: "alerta" },
} as const;

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

  const [atendimento, clientes, servicos] = await Promise.all([
    prisma.agendamento.findUnique({
      where: { id },
      include: {
        cliente: true,
        servico: { include: { insumos: { include: { produto: true } } } },
        movimentos: { include: { produto: true } },
      },
    }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, enderecoPadrao: true } }),
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, precoCentavos: true, duracaoMin: true },
    }),
  ]);

  if (!atendimento) notFound();

  const a = atendimento;
  const visual = APARENCIA[a.status];
  const janela = janelaOcupada(a);
  const temTransito = a.deslocamentoIdaMin > 0 || a.deslocamentoVoltaMin > 0;
  const total = a.precoCentavos + a.taxaDeslocamentoCentavos;
  const consumo = a.movimentos.filter((m) => m.tipo === "CONSUMO");

  const mensagem = mensagemLembrete({
    cliente: a.cliente,
    servico: a.servico,
    inicio: a.inicio,
    local: a.local,
    endereco: a.endereco,
  });

  return (
    <>
      <Titulo>{a.cliente.nome}</Titulo>

      <Cartao className="mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Etiqueta tom={visual.tom}>{visual.rotulo}</Etiqueta>
              <Etiqueta>{a.local === "DOMICILIO" ? "domicílio" : "estúdio"}</Etiqueta>
              {a.lembreteEnviadoEm && <Etiqueta tom="ok">lembrete enviado</Etiqueta>}
            </div>
            <p className="text-lg font-medium capitalize text-texto">{dataLonga(a.inicio)}</p>
            <p className="text-2xl font-semibold text-texto">
              {hora(a.inicio)} – {hora(a.fim)}
            </p>
            {temTransito && (
              <p className="mt-1 text-sm text-texto-fraco">
                Com deslocamento, ocupa das {hora(janela.de)} às {hora(janela.ate)}
              </p>
            )}
            <p className="mt-2 text-sm text-texto-suave">{a.servico.nome}</p>
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

        {a.status === "PENDENTE" && (
          <form action={mudarStatus}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="status" value="CONFIRMADO" />
            <BotaoAcao>Confirmar</BotaoAcao>
          </form>
        )}

        {a.status !== "CONCLUIDO" && a.status !== "CANCELADO" && (
          <form action={concluirAtendimento}>
            <input type="hidden" name="id" value={a.id} />
            <BotaoAcao destaque>Concluir e dar baixa no estoque</BotaoAcao>
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

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">Editar</h2>
      <FormularioAtendimento
        acao={atualizarAtendimento}
        clientes={clientes}
        servicos={servicos.map((s) => ({
          id: s.id,
          nome: s.nome,
          duracaoMin: s.duracaoMin,
          precoReais: paraCampoReal(s.precoCentavos),
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
