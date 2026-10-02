import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { deslocarMes, mesAtual, relatorioDoMes } from "@/lib/relatorio";
import { ROTULO_FORMA } from "@/lib/financeiro";
import { formatarReal } from "@/lib/dinheiro";
import { dataCurta, hora } from "@/lib/tempo";
import { Cartao, EtiquetaStatus, Vazio } from "@/components/ui";
import { ESTOQUE_ATIVO } from "@/lib/recursos";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function nomeDoMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1]} de ${ano}`;
}

export default async function PaginaFinanceiro(props: PageProps<"/financeiro">) {
  await exigirSessao();

  const { m } = await props.searchParams;
  const atual = mesAtual();
  const mes = typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : atual;

  const r = await relatorioDoMes(mes);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold capitalize tracking-tight text-texto">
          {nomeDoMes(mes)}
        </h1>
        <p className="mt-0.5 text-sm text-texto-fraco">
          {r.quantos === 0
            ? "Nenhum atendimento neste mês"
            : `${r.quantos} atendimento${r.quantos > 1 ? "s" : ""}, ${r.quantosConcluidos} concluído${r.quantosConcluidos === 1 ? "" : "s"}`}
        </p>
      </div>

      <nav className="mb-6 flex items-center gap-2">
        <Link
          href={`/financeiro?m=${deslocarMes(mes, -1)}`}
          className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          ← Mês anterior
        </Link>
        {mes !== atual && (
          <Link
            href="/financeiro"
            className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-marca transition hover:bg-superficie-suave"
          >
            Mês atual
          </Link>
        )}
        <Link
          href={`/financeiro?m=${deslocarMes(mes, 1)}`}
          className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          Próximo mês →
        </Link>
      </nav>

      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Cartao className="p-5">
          <p className="text-sm font-medium text-texto-suave">Entrou no mês</p>
          <p className="mt-1 text-2xl font-semibold text-positivo">{formatarReal(r.recebidoNoMes)}</p>
          <p className="text-xs text-texto-fraco">pela data do pagamento</p>
        </Cartao>
        {ESTOQUE_ATIVO && (
          <>
            <Cartao className="p-5">
              <p className="text-sm font-medium text-texto-suave">Produtos usados</p>
              <p className="mt-1 text-2xl font-semibold text-texto">{formatarReal(r.custoProdutos)}</p>
              <p className="text-xs text-texto-fraco">só dos concluídos</p>
            </Cartao>
            <Cartao className="p-5">
              <p className="text-sm font-medium text-texto-suave">Sobrou</p>
              <p className={`mt-1 text-2xl font-semibold ${r.sobra >= 0 ? "text-positivo" : "text-perigo"}`}>
                {formatarReal(r.sobra)}
              </p>
              <p className="text-xs text-texto-fraco">entrou menos produtos</p>
            </Cartao>
          </>
        )}
        {r.repasses > 0 && (
          <Cartao className="p-5">
            <p className="text-sm font-medium text-texto-suave">Repasses</p>
            <p className="mt-1 text-2xl font-semibold text-texto">{formatarReal(r.repasses)}</p>
            <p className="text-xs text-texto-fraco">às parceiras</p>
          </Cartao>
        )}
        {r.repasses > 0 && (
          <Cartao className="p-5">
            <p className="text-sm font-medium text-texto-suave">Ficou com você</p>
            <p className={`mt-1 text-2xl font-semibold ${r.sobra >= 0 ? "text-positivo" : "text-perigo"}`}>
              {formatarReal(r.sobra)}
            </p>
            {/* Diz a conta inteira: um desconto que a tela não explica é o
                que faz o número parecer errado. */}
            <p className="text-xs text-texto-fraco">
              {ESTOQUE_ATIVO ? "entrou menos repasses e produtos" : "entrou menos repasses"}
            </p>
          </Cartao>
        )}
        <Cartao className="p-5">
          <p className="text-sm font-medium text-texto-suave">Total do mês</p>
          <p className="mt-1 text-2xl font-semibold text-texto">{formatarReal(r.combinado)}</p>
          <p className="text-xs text-texto-fraco">combinado nos atendimentos</p>
        </Cartao>
        <Cartao className="p-5">
          <p className="text-sm font-medium text-texto-suave">Ainda a receber</p>
          <p className={`mt-1 text-2xl font-semibold ${r.aReceber > 0 ? "text-atencao" : "text-texto-fraco"}`}>
            {formatarReal(r.aReceber)}
          </p>
          <p className="text-xs text-texto-fraco">dos atendimentos do mês</p>
        </Cartao>
      </div>

      {r.porForma.length > 0 && (
        <Cartao className="mb-6 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            Como entrou
          </h2>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {r.porForma.map(([forma, valor]) => (
              <div key={forma}>
                <p className="text-xs text-texto-fraco">
                  {ROTULO_FORMA[forma as keyof typeof ROTULO_FORMA]}
                </p>
                <p className="text-lg font-semibold text-texto">{formatarReal(valor)}</p>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {r.porServico.length > 0 && (
        <Cartao className="mb-6 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            Por serviço
          </h2>
          <ul className="space-y-2 text-sm">
            {r.porServico.map((s) => (
              <li key={s.nome} className="flex items-baseline justify-between gap-4">
                <span className="text-texto">
                  {s.nome} <span className="text-texto-fraco">× {s.quantos}</span>
                </span>
                <span className="font-medium text-texto-suave">{formatarReal(s.total)}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
        Atendimentos do mês
      </h2>
      {r.atendimentos.length === 0 ? (
        <Vazio titulo="Mês sem movimento" descricao="Nenhum atendimento marcado neste período." />
      ) : (
        <Cartao className="mb-8 divide-y divide-borda-suave">
          {r.atendimentos.map(({ atendimento: a, conta }) => (
            <Link
              key={a.id}
              href={`/agenda/${a.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 transition hover:bg-superficie-suave"
            >
              <span className="w-24 shrink-0 font-mono text-xs text-texto-fraco">
                {dataCurta(a.inicio)} {hora(a.inicio)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-texto">
                {a.cliente.nome}
                <span className="text-texto-fraco"> · {a.servico.nome}</span>
              </span>
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
      )}

      {r.entradas.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            Recebimentos do mês
          </h2>
          <Cartao className="divide-y divide-borda-suave">
            {r.entradas.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                <span className="w-16 shrink-0 font-mono text-xs text-texto-fraco">
                  {dataCurta(p.pagoEm)}
                </span>
                <span className="min-w-0 flex-1 truncate text-texto">
                  {p.agendamento.cliente.nome}
                  <span className="text-texto-fraco">
                    {" "}· {ROTULO_FORMA[p.forma]}
                  </span>
                </span>
                <span
                  className={`font-mono font-medium ${p.valorCentavos < 0 ? "text-perigo" : "text-positivo"}`}
                >
                  {p.valorCentavos < 0 ? "" : "+"}
                  {formatarReal(p.valorCentavos)}
                </span>
              </div>
            ))}
          </Cartao>
        </>
      )}
    </>
  );
}
