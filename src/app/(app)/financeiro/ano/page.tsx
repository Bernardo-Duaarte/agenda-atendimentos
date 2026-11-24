import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { anosComMovimento, relatorioDoAno, type MesDoAno } from "@/lib/relatorio";
import { formatarReal } from "@/lib/dinheiro";
import { rotuloOrigem } from "@/lib/origem";
import { Cartao } from "@/components/ui";

const CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Barra de magnitude dentro da linha do mês.
 *
 * Fina e com as pontas arredondadas, encostada no começo da trilha. O número
 * aparece sempre ao lado: a barra serve para comparar meses de relance, não
 * para ser lida — quem informa o valor é o texto.
 */
function Barra({ parte }: { parte: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-superficie-suave" aria-hidden>
      {parte > 0 && (
        <div
          className="h-full rounded-full bg-acao"
          // Mínimo de 2% para um mês pequeno não sumir por completo.
          style={{ width: `${Math.max(2, parte * 100)}%` }}
        />
      )}
    </div>
  );
}

function Destaque({
  rotulo,
  valor,
  explica,
  tom = "normal",
}: {
  rotulo: string;
  valor: string;
  explica?: string;
  tom?: "normal" | "bom";
}) {
  return (
    <div>
      <p className="text-sm font-medium text-texto-suave">{rotulo}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${tom === "bom" ? "text-positivo" : "text-texto"}`}
      >
        {valor}
      </p>
      {explica && <p className="text-xs text-texto-fraco">{explica}</p>}
    </div>
  );
}

export default async function PaginaAno(props: PageProps<"/financeiro/ano">) {
  await exigirSessao();

  const { a } = await props.searchParams;
  const anos = await anosComMovimento();
  const agora = new Date().getFullYear();
  const pedido = typeof a === "string" && /^\d{4}$/.test(a) ? Number(a) : agora;
  const ano = anos.includes(pedido) ? pedido : (anos.includes(agora) ? agora : anos[anos.length - 1]!);

  const r = await relatorioDoAno(ano);

  // Escala de cada bloco, separada: dinheiro e pessoas não dividem eixo. Uma
  // barra de R$ 6.000 ao lado de uma de 8 clientes sugeriria comparação entre
  // coisas que não se comparam.
  const tetoDinheiro = Math.max(...r.meses.map((m) => m.seu), 1);
  const tetoClientes = Math.max(...r.meses.map((m) => m.clientesNovas), 1);

  const temMovimento = r.total.atendimentos > 0 || r.total.entrou > 0;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-texto">O ano de {ano}</h1>
        <p className="mt-0.5 text-sm text-texto-fraco">
          {r.total.atendimentos} atendimento{r.total.atendimentos === 1 ? "" : "s"} em doze meses
        </p>
      </div>

      <nav className="mb-8 flex flex-wrap items-center gap-2">
        {anos.map((x) => (
          <Link
            key={x}
            href={`/financeiro/ano?a=${x}`}
            aria-current={x === ano ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              x === ano
                ? "border-acao bg-acao text-acao-texto"
                : "border-borda text-texto-suave hover:bg-superficie-suave"
            }`}
          >
            {x}
          </Link>
        ))}
        <Link
          href="/financeiro"
          className="ml-auto rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          Ver mês a mês →
        </Link>
      </nav>

      {!temMovimento ? (
        <Cartao className="px-5 py-10 text-center">
          <p className="text-sm text-texto-fraco">Nada registrado em {ano}.</p>
        </Cartao>
      ) : (
        <>
          {/* ───────── o ano em quatro números ───────── */}
          <Cartao className="mb-10 grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Destaque
              rotulo="Faturamento do ano"
              valor={formatarReal(r.total.combinado)}
              explica="tudo que foi combinado"
            />
            <Destaque
              rotulo="Seu no ano"
              valor={formatarReal(r.total.seu)}
              explica="faturamento menos repasses"
              tom="bom"
            />
            <Destaque
              rotulo="Entrou no ano"
              valor={formatarReal(r.total.entrou)}
              explica="pela data do pagamento"
            />
            <Destaque
              rotulo="Ainda a receber"
              valor={formatarReal(r.total.aReceber)}
              explica="dos atendimentos do ano"
            />
          </Cartao>

          {/* ───────── dinheiro mês a mês ───────── */}
          <section className="mb-10">
            <div className="mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-texto">
                Dinheiro mês a mês
              </h2>
              <p className="mt-0.5 text-xs text-texto-fraco">
                A barra compara o <strong className="font-medium">seu no mês</strong>. Toque num mês
                para abrir o detalhe dele.
              </p>
            </div>

            <Cartao className="divide-y divide-borda-suave">
              <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem_6rem] gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wide text-texto-fraco sm:grid">
                <span>mês</span>
                <span />
                <span className="text-right">seu</span>
                <span className="text-right">entrou</span>
                <span className="text-right">a receber</span>
              </div>

              {r.meses.map((m) => (
                <LinhaMes key={m.mes} m={m} teto={tetoDinheiro} />
              ))}

              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_6rem] items-center gap-3 px-4 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem_6rem]">
                <span className="text-sm font-semibold text-texto">ano</span>
                <span />
                <span className="text-right text-sm font-semibold tabular-nums text-texto">
                  {formatarReal(r.total.seu)}
                </span>
                <span className="hidden text-right text-sm font-semibold tabular-nums text-texto sm:block">
                  {formatarReal(r.total.entrou)}
                </span>
                <span className="hidden text-right text-sm font-semibold tabular-nums text-texto sm:block">
                  {formatarReal(r.total.aReceber)}
                </span>
              </div>
            </Cartao>
          </section>

          {/* ───────── clientes mês a mês ───────── */}
          <section className="mb-10">
            <div className="mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-texto">
                Clientes mês a mês
              </h2>
              <p className="mt-0.5 text-xs text-texto-fraco">
                A barra compara as <strong className="font-medium">novas cadastradas</strong>.
                “Primeira vez” é quem estreou no atendimento — pode ser outro mês, porque uma noiva
                se cadastra meses antes da festa.
              </p>
            </div>

            <Cartao className="divide-y divide-borda-suave">
              <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_5rem_6rem_6rem] gap-3 px-4 py-2 text-xs font-medium uppercase tracking-wide text-texto-fraco sm:grid">
                <span>mês</span>
                <span />
                <span className="text-right">novas</span>
                <span className="text-right">1ª vez</span>
                <span className="text-right">atendim.</span>
              </div>

              {r.meses.map((m) => (
                <div
                  key={m.mes}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-3 px-4 py-2.5 sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_6rem_6rem]"
                >
                  <span className="text-sm text-texto-suave">{CURTO[m.numero - 1]}</span>
                  <Barra parte={m.clientesNovas / tetoClientes} />
                  <span className="text-right text-sm font-medium tabular-nums text-texto">
                    {m.clientesNovas}
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-texto-suave sm:block">
                    {m.primeiraVez}
                  </span>
                  <span className="hidden text-right text-sm tabular-nums text-texto-fraco sm:block">
                    {m.atendimentos}
                  </span>
                </div>
              ))}

              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-3 px-4 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_6rem_6rem]">
                <span className="text-sm font-semibold text-texto">ano</span>
                <span />
                <span className="text-right text-sm font-semibold tabular-nums text-texto">
                  {r.total.clientesNovas}
                </span>
                <span className="hidden text-right text-sm font-semibold tabular-nums text-texto sm:block">
                  {r.total.primeiraVez}
                </span>
                <span className="hidden text-right text-sm font-semibold tabular-nums text-texto sm:block">
                  {r.total.atendimentos}
                </span>
              </div>
            </Cartao>

            {/* No celular as colunas extras não cabem na linha; vão aqui. */}
            <p className="mt-2 text-xs text-texto-fraco sm:hidden">
              No ano: {r.total.clientesNovas} novas · {r.total.primeiraVez} estrearam ·{" "}
              {r.total.atendimentos} atendimentos.
            </p>
          </section>

          {/* ───────── de onde elas vieram ───────── */}
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto">
              Como elas te conheceram
            </h2>
            <Cartao className="p-5">
              {r.porOrigem.every((o) => !o.origem) ? (
                <p className="text-sm text-texto-fraco">
                  Ainda não há origem preenchida. O campo “Como me conheceu” aparece no cadastro da
                  cliente, e a partir daí este quadro se preenche sozinho.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {r.porOrigem.map((o) => (
                    <li key={o.origem ?? "sem"} className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-3">
                      <span className="truncate text-sm text-texto-suave">
                        {rotuloOrigem(o.origem) ?? "Não informado"}
                      </span>
                      <Barra parte={o.quantas / Math.max(...r.porOrigem.map((x) => x.quantas), 1)} />
                      <span className="text-right text-sm font-medium tabular-nums text-texto">
                        {o.quantas}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          </section>
        </>
      )}
    </>
  );
}

/** Linha de um mês no bloco de dinheiro. Clicar abre o mês. */
function LinhaMes({ m, teto }: { m: MesDoAno; teto: number }) {
  return (
    <Link
      href={`/financeiro?m=${m.mes}`}
      title={`${formatarReal(m.combinado)} combinado, ${formatarReal(m.repasses)} de repasses`}
      className="grid grid-cols-[2.5rem_minmax(0,1fr)_6rem] items-center gap-3 px-4 py-2.5 transition hover:bg-superficie-suave sm:grid-cols-[2.5rem_minmax(0,1fr)_6rem_6rem_6rem]"
    >
      <span className="text-sm text-texto-suave">{CURTO[m.numero - 1]}</span>
      <Barra parte={m.seu / teto} />
      <span className="text-right text-sm font-medium tabular-nums text-texto">
        {formatarReal(m.seu)}
      </span>
      <span className="hidden text-right text-sm tabular-nums text-texto-suave sm:block">
        {formatarReal(m.entrou)}
      </span>
      <span
        className={`hidden text-right text-sm tabular-nums sm:block ${
          m.aReceber > 0 ? "text-atencao" : "text-texto-fraco"
        }`}
      >
        {formatarReal(m.aReceber)}
      </span>
    </Link>
  );
}
