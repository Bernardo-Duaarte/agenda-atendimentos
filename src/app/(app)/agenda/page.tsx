import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { deslocarDia, hojeEmSaoPaulo, resumoDoDia } from "@/lib/agenda-consulta";
import { dataLonga, hora, janelaOcupada } from "@/lib/tempo";
import { formatarReal } from "@/lib/dinheiro";
import { BotaoLink, Cartao, Etiqueta, Vazio } from "@/components/ui";

const APARENCIA = {
  PENDENTE: { rotulo: "a confirmar", tom: "alerta" },
  CONFIRMADO: { rotulo: "confirmado", tom: "ok" },
  CONCLUIDO: { rotulo: "concluído", tom: "neutro" },
  CANCELADO: { rotulo: "cancelado", tom: "neutro" },
  FALTOU: { rotulo: "não veio", tom: "alerta" },
} as const;

export default async function PaginaAgenda(props: PageProps<"/agenda">) {
  await exigirSessao();

  const { d } = await props.searchParams;
  const hoje = hojeEmSaoPaulo();
  const dia = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hoje;

  const { atendimentos, total, previsto } = await resumoDoDia(dia);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold capitalize tracking-tight text-texto">
            {dataLonga(new Date(`${dia}T12:00:00Z`))}
          </h1>
          <p className="mt-0.5 text-sm text-texto-fraco">
            {total === 0
              ? "Nenhum atendimento"
              : `${total} atendimento${total > 1 ? "s" : ""} · ${formatarReal(previsto)}`}
            {dia === hoje && " · hoje"}
          </p>
        </div>
        <BotaoLink href="/agenda/novo">Marcar atendimento</BotaoLink>
      </div>

      <nav className="mb-5 flex items-center gap-2">
        <Link
          href={`/agenda?d=${deslocarDia(dia, -1)}`}
          className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          ← Dia anterior
        </Link>
        {dia !== hoje && (
          <Link
            href="/agenda"
            className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-marca transition hover:bg-superficie-suave"
          >
            Hoje
          </Link>
        )}
        <Link
          href={`/agenda?d=${deslocarDia(dia, 1)}`}
          className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave"
        >
          Próximo dia →
        </Link>
      </nav>

      {atendimentos.length === 0 ? (
        <Vazio
          titulo="Dia livre"
          descricao="Nenhum atendimento marcado para este dia."
          acao={<BotaoLink href={`/agenda/novo?d=${dia}`}>Marcar atendimento</BotaoLink>}
        />
      ) : (
        <Cartao className="divide-y divide-borda-suave">
          {atendimentos.map((a) => {
            const janela = janelaOcupada(a);
            const temTransito = a.deslocamentoIdaMin > 0 || a.deslocamentoVoltaMin > 0;
            const visual = APARENCIA[a.status];
            const riscado = a.status === "CANCELADO";

            return (
              <Link
                key={a.id}
                href={`/agenda/${a.id}`}
                className="flex gap-4 px-5 py-4 transition hover:bg-superficie-suave"
              >
                <div className="w-16 shrink-0 text-right">
                  <p className={`font-mono text-base font-semibold ${riscado ? "text-texto-fraco line-through" : "text-texto"}`}>
                    {hora(a.inicio)}
                  </p>
                  <p className="font-mono text-xs text-texto-fraco">{hora(a.fim)}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium ${riscado ? "text-texto-fraco line-through" : "text-texto"}`}>
                      {a.cliente.nome}
                    </span>
                    <Etiqueta tom={visual.tom}>{visual.rotulo}</Etiqueta>
                    {a.local === "DOMICILIO" && <Etiqueta>domicílio</Etiqueta>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-texto-fraco">
                    {a.servico.nome}
                    {temTransito && ` · ocupa ${hora(janela.de)}–${hora(janela.ate)} com trânsito`}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-medium text-texto-suave">
                  {formatarReal(a.precoCentavos + a.taxaDeslocamentoCentavos)}
                </p>
              </Link>
            );
          })}
        </Cartao>
      )}
    </>
  );
}
