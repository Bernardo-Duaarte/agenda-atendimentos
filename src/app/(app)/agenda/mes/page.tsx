import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { atendimentosDoMes, hojeEmSaoPaulo } from "@/lib/agenda-consulta";
import { semanasDoMes } from "@/lib/calendario-mes";
import { deslocarMes, mesAtual } from "@/lib/relatorio";
import { hora } from "@/lib/tempo";
import { formatarReal } from "@/lib/dinheiro";
import { Cartao } from "@/components/ui";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function nomeDoMes(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1]} de ${ano}`;
}

export default async function PaginaMes(props: PageProps<"/agenda/mes">) {
  await exigirSessao();

  const { m } = await props.searchParams;
  const atual = mesAtual();
  const mes = typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : atual;
  const hoje = hojeEmSaoPaulo();

  const [porDia, semanas] = await Promise.all([
    atendimentosDoMes(mes),
    Promise.resolve(semanasDoMes(mes)),
  ]);

  const doMes = [...porDia.entries()].filter(([d]) => d.startsWith(mes));
  const totalAtendimentos = doMes.reduce(
    (t, [, lista]) => t + lista.filter((a) => a.status !== "CANCELADO").length,
    0,
  );
  const totalPrevisto = doMes.reduce(
    (t, [, lista]) =>
      t +
      lista
        .filter((a) => a.status !== "CANCELADO")
        .reduce((s, a) => s + a.precoCentavos + a.taxaDeslocamentoCentavos, 0),
    0,
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-texto first-letter:uppercase">
            {nomeDoMes(mes)}
          </h1>
          <p className="mt-0.5 text-sm text-texto-fraco">
            {totalAtendimentos === 0
              ? "Nenhum atendimento no mês"
              : `${totalAtendimentos} atendimento${totalAtendimentos > 1 ? "s" : ""} · ${formatarReal(totalPrevisto)}`}
          </p>
        </div>
        <Link
          href="/agenda"
          className="rounded-lg border border-borda px-4 py-2 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          Ver por dia
        </Link>
      </div>

      <nav className="mb-5 flex flex-wrap items-center gap-2">
        <Link
          href={`/agenda/mes?m=${deslocarMes(mes, -1)}`}
          className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          ← Mês anterior
        </Link>
        {mes !== atual && (
          <Link
            href="/agenda/mes"
            className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-marca transition hover:bg-superficie-suave"
          >
            Mês atual
          </Link>
        )}
        <Link
          href={`/agenda/mes?m=${deslocarMes(mes, 1)}`}
          className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          Próximo mês →
        </Link>
      </nav>

      <Cartao className="overflow-hidden p-0">
        <div className="grid grid-cols-7 border-b border-borda bg-superficie-suave">
          {DIAS.map((d) => (
            <div key={d} className="px-1 py-2 text-center text-xs font-medium uppercase text-texto-fraco">
              {d}
            </div>
          ))}
        </div>

        {semanas.map((semana) => (
          <div key={semana[0]!.data} className="grid grid-cols-7 border-b border-borda-suave last:border-b-0">
            {semana.map((dia) => {
              const lista = (porDia.get(dia.data) ?? []).filter((a) => a.status !== "CANCELADO");
              const ehHoje = dia.data === hoje;

              return (
                <Link
                  key={dia.data}
                  href={`/agenda?d=${dia.data}`}
                  className={`min-h-20 border-r border-borda-suave p-1.5 transition last:border-r-0 hover:bg-superficie-suave sm:min-h-24 ${
                    dia.doMes ? "" : "opacity-40"
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      ehHoje ? "bg-acao text-acao-texto" : "text-texto-suave"
                    }`}
                  >
                    {Number(dia.data.slice(8))}
                  </span>

                  {/* No celular a célula não cabe texto: vira um ponto por
                      atendimento, que já responde "esse dia tem coisa?". */}
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {lista.slice(0, 4).map((a) => (
                      <span key={a.id} className="h-1.5 w-1.5 rounded-full bg-marca" />
                    ))}
                  </div>

                  <div className="mt-1 hidden space-y-0.5 sm:block">
                    {lista.slice(0, 3).map((a) => (
                      <p key={a.id} className="truncate text-[11px] leading-tight text-texto-suave">
                        <span className="font-mono text-texto-fraco">{hora(a.inicio)}</span>{" "}
                        {a.cliente.nome.split(" ")[0]}
                      </p>
                    ))}
                    {lista.length > 3 && (
                      <p className="text-[11px] text-texto-fraco">+{lista.length - 3}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </Cartao>

      <p className="mt-3 text-sm text-texto-fraco">Toque num dia para abrir a agenda dele.</p>
    </>
  );
}
