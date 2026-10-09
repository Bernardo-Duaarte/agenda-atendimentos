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

/**
 * Um número com rótulo. Existe para os dois blocos terem a mesma aparência e
 * ficar claro, à distância, que são contas irmãs e não a mesma conta.
 */
function Numero({
  rotulo,
  valor,
  explica,
  tom = "normal",
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  explica?: string;
  tom?: "normal" | "bom" | "atencao" | "fraco";
  destaque?: boolean;
}) {
  const cor = {
    normal: "text-texto",
    bom: "text-positivo",
    atencao: "text-atencao",
    fraco: "text-texto-fraco",
  }[tom];

  return (
    <div className={destaque ? "rounded-lg bg-superficie-suave px-4 py-3" : ""}>
      <p className="text-sm font-medium text-texto-suave">{rotulo}</p>
      <p className={`mt-1 text-2xl font-semibold ${cor}`}>{formatarReal(valor)}</p>
      {explica && <p className="text-xs text-texto-fraco">{explica}</p>}
    </div>
  );
}

export default async function PaginaFinanceiro(props: PageProps<"/financeiro">) {
  await exigirSessao();

  const { m } = await props.searchParams;
  const atual = mesAtual();
  const mes = typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : atual;

  const { trabalho, caixa, atendimentos } = await relatorioDoMes(mes);

  // O rótulo de "Seu no mês" nomeia tudo o que foi descontado. Um rótulo que
  // omite uma parcela da conta é o que fazia o número parecer errado antes.
  const descontos = [
    trabalho.repasses > 0 && "repasses",
    ESTOQUE_ATIVO && trabalho.custoProdutos > 0 && "produtos",
  ].filter((x): x is string => typeof x === "string");

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold capitalize tracking-tight text-texto">
          {nomeDoMes(mes)}
        </h1>
        <p className="mt-0.5 text-sm text-texto-fraco">
          {trabalho.quantos === 0
            ? "Nenhum atendimento fechado neste mês"
            : `${trabalho.quantos} atendimento${trabalho.quantos > 1 ? "s" : ""}, ${trabalho.quantosConcluidos} concluído${trabalho.quantosConcluidos === 1 ? "" : "s"}`}
        </p>
      </div>

      <nav className="mb-8 flex items-center gap-2">
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

      {/* ───────────────── Bloco 1: o trabalho do mês ───────────────── */}

      <section className="mb-10">
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-texto">
            Trabalho de {nomeDoMes(mes).replace(/ de \d{4}$/, "")}
          </h2>
          <p className="mt-0.5 text-xs text-texto-fraco">
            Os atendimentos marcados neste mês, não importa quando foram pagos.
          </p>
        </div>

        {trabalho.quantos === 0 ? (
          <Cartao className="px-5 py-8 text-center">
            <p className="text-sm text-texto-fraco">Nenhum atendimento fechado neste mês.</p>
          </Cartao>
        ) : (
          <Cartao className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Numero
                rotulo="Combinado no mês"
                valor={trabalho.combinado}
                explica="serviços e taxas de deslocamento"
              />
              {trabalho.repasses > 0 && (
                <Numero
                  rotulo="Repasses"
                  valor={trabalho.repasses}
                  explica="às parceiras, de todo atendimento do mês"
                />
              )}
              {ESTOQUE_ATIVO && trabalho.custoProdutos > 0 && (
                <Numero
                  rotulo="Produtos usados"
                  valor={trabalho.custoProdutos}
                  explica="só dos concluídos"
                />
              )}
              <Numero
                rotulo="Seu no mês"
                valor={trabalho.seu}
                explica={
                  descontos.length > 0
                    ? `combinado menos ${descontos.join(" e ")}`
                    : "nada a descontar neste mês"
                }
                tom={trabalho.seu >= 0 ? "bom" : "atencao"}
                destaque
              />
            </div>

            <div className="grid gap-5 border-t border-borda-suave pt-5 sm:grid-cols-2">
              <Numero
                rotulo="Já recebido"
                valor={trabalho.recebido}
                explica={
                  trabalho.recebido > trabalho.combinado
                    ? `inclui ${formatarReal(trabalho.recebido - trabalho.combinado)} além do combinado`
                    : "destes atendimentos, em qualquer data"
                }
              />
              <Numero
                rotulo="Ainda a receber"
                valor={trabalho.aReceber}
                explica="destes atendimentos"
                tom={trabalho.aReceber > 0 ? "atencao" : "fraco"}
              />
            </div>
          </Cartao>
        )}

        {(trabalho.preAgendados.quantos > 0 || trabalho.naoAconteceram.quantos > 0) && (
          <div className="mt-3 space-y-1.5">
            {trabalho.preAgendados.quantos > 0 && (
              <p className="text-xs text-texto-fraco">
                Fora da conta: {trabalho.preAgendados.quantos} pré-agendamento
                {trabalho.preAgendados.quantos > 1 ? "s" : ""} somando{" "}
                {formatarReal(trabalho.preAgendados.valor)} — entram quando o sinal for pago.
              </p>
            )}
            {trabalho.naoAconteceram.quantos > 0 && (
              <p className="text-xs text-texto-fraco">
                Fora da conta: {trabalho.naoAconteceram.quantos} cancelado ou falta
                {trabalho.naoAconteceram.retido > 0 &&
                  `, com ${formatarReal(trabalho.naoAconteceram.retido)} que ficaram com você`}
                .
              </p>
            )}
          </div>
        )}

        {trabalho.porServico.length > 0 && (
          <Cartao className="mt-4 p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-texto-fraco">
              Por serviço
            </h3>
            <ul className="space-y-2 text-sm">
              {trabalho.porServico.map((s) => (
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
      </section>

      {/* ───────────────── Bloco 2: o dinheiro do mês ───────────────── */}

      <section className="mb-10">
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-texto">
            Dinheiro que entrou em {nomeDoMes(mes).replace(/ de \d{4}$/, "")}
          </h2>
          <p className="mt-0.5 text-xs text-texto-fraco">
            Conta diferente da de cima, e de propósito: aqui vale a data do pagamento. Os dois
            números não se somam nem se subtraem.
          </p>
        </div>

        {caixa.entrou === 0 ? (
          <Cartao className="px-5 py-8 text-center">
            <p className="text-sm text-texto-fraco">Nenhum pagamento recebido neste mês.</p>
          </Cartao>
        ) : (
          <Cartao className="space-y-5 p-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Numero rotulo="Entrou no mês" valor={caixa.entrou} tom="bom" destaque />
              <Numero
                rotulo="De atendimento deste mês"
                valor={caixa.doProprioMes}
                explica="também aparece no bloco de cima"
              />
              {caixa.deOutrosMeses !== 0 && (
                <Numero
                  rotulo="De outro mês"
                  valor={caixa.deOutrosMeses}
                  explica="sinal de festa futura, ou parcela de festa já passada"
                />
              )}
            </div>

            {caixa.porForma.length > 0 && (
              <div className="border-t border-borda-suave pt-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-texto-fraco">
                  Como entrou
                </h3>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  {caixa.porForma.map(([forma, valor]) => (
                    <div key={forma}>
                      <p className="text-xs text-texto-fraco">
                        {ROTULO_FORMA[forma as keyof typeof ROTULO_FORMA]}
                      </p>
                      <p className="text-lg font-semibold text-texto">{formatarReal(valor)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Cartao>
        )}

        {caixa.entradas.length > 0 && (
          <Cartao className="mt-4 divide-y divide-borda-suave">
            {caixa.entradas.map((p) => {
              const doMes = p.doMesDoRelatorio;
              return (
                <Link
                  key={p.id}
                  href={`/agenda/${p.agendamento.id}`}
                  className="flex items-center gap-4 px-5 py-2.5 text-sm transition hover:bg-superficie-suave"
                >
                  <span className="w-16 shrink-0 font-mono text-xs text-texto-fraco">
                    {dataCurta(p.pagoEm)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-texto">
                    {p.agendamento.cliente.nome}
                    <span className="text-texto-fraco">
                      {" "}· {ROTULO_FORMA[p.forma]}
                      {/* Sem isto, um pagamento de festa futura parece um erro
                          no meio da lista do mês. */}
                      {!doMes && ` · atendimento ${dataCurta(p.agendamento.inicio)}`}
                    </span>
                  </span>
                  <span
                    className={`font-mono font-medium ${p.valorCentavos < 0 ? "text-perigo" : "text-positivo"}`}
                  >
                    {p.valorCentavos < 0 ? "" : "+"}
                    {formatarReal(p.valorCentavos)}
                  </span>
                </Link>
              );
            })}
          </Cartao>
        )}
      </section>

      {/* ───────────────── A lista do mês ───────────────── */}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
        Atendimentos do mês
      </h2>
      {atendimentos.length === 0 ? (
        <Vazio titulo="Mês sem movimento" descricao="Nenhum atendimento marcado neste período." />
      ) : (
        <Cartao className="mb-8 divide-y divide-borda-suave">
          {atendimentos.map(({ atendimento: a, conta }) => (
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
    </>
  );
}
