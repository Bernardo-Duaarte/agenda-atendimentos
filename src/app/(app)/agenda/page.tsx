import Link from "next/link";
import { exigirSessao } from "@/lib/sessao";
import { deslocarDia, hojeEmSaoPaulo, resumoDoDia } from "@/lib/agenda-consulta";
import { dataLonga, hora, janelaOcupada } from "@/lib/tempo";
import { formatarReal } from "@/lib/dinheiro";
import { BotaoLink, Cartao, Etiqueta, EtiquetaStatus, Vazio } from "@/components/ui";
import { SeletorDeDia } from "./seletor-de-dia";

export default async function PaginaAgenda(props: PageProps<"/agenda">) {
  await exigirSessao();

  const { d } = await props.searchParams;
  const hoje = hojeEmSaoPaulo();
  const dia = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hoje;

  const { atendimentos, conflitos, compromissosPessoais, erroCalendarioPessoal, choquesPessoais, total, previsto } =
    await resumoDoDia(dia);

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

      <nav className="mb-5 flex flex-wrap items-center gap-2">
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

        <Link
          href={`/agenda/mes?m=${dia.slice(0, 7)}`}
          className="rounded-lg border border-borda px-3 py-1.5 text-sm font-medium text-marca transition hover:bg-superficie-suave"
        >
          Ver o mês
        </Link>

        <div className="ml-auto">
          <SeletorDeDia dia={dia} />
        </div>
      </nav>

      {compromissosPessoais.length > 0 && (
        <Cartao className="mb-5 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-texto-fraco">
            Da sua agenda pessoal
          </h2>
          <ul className="space-y-1 text-sm">
            {compromissosPessoais.map((c) => (
              <li key={c.id} className="flex gap-3">
                <span className="w-24 shrink-0 font-mono text-xs text-texto-fraco">
                  {c.diaInteiro ? "dia inteiro" : `${hora(c.inicio)}–${hora(c.fim)}`}
                </span>
                <span className="min-w-0 flex-1 truncate text-texto-suave">{c.titulo}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {erroCalendarioPessoal && (
        <Cartao className="mb-5 border-atencao-fundo p-4">
          <p className="text-sm text-atencao-texto">
            Sua agenda pessoal não pôde ser lida: {erroCalendarioPessoal}
          </p>
        </Cartao>
      )}

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
                    <EtiquetaStatus status={a.status} />
                    {a.local === "DOMICILIO" && <Etiqueta>domicílio</Etiqueta>}
                    {conflitos.has(a.id) && <Etiqueta tom="alerta">choca com outro</Etiqueta>}
                    {choquesPessoais.has(a.id) && <Etiqueta tom="alerta">agenda pessoal</Etiqueta>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-texto-fraco">
                    {a.servico.nome}
                    {temTransito && ` · ocupa ${hora(janela.de)}–${hora(janela.ate)} com trânsito`}
                  </p>
                  {conflitos.has(a.id) && (
                    <p className="mt-0.5 text-sm text-atencao-texto">
                      Mesmo horário de {conflitos.get(a.id)!.join(", ")} — quem pagar o sinal fica
                    </p>
                  )}
                  {choquesPessoais.has(a.id) && (
                    <p className="mt-0.5 text-sm text-atencao-texto">
                      Em cima de {choquesPessoais.get(a.id)!.join(", ")}, da sua agenda pessoal
                    </p>
                  )}
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
