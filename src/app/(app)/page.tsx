import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { proximosAtendimentos, resumoDoDia, hojeEmSaoPaulo } from "@/lib/agenda-consulta";
import { dataCurta, hora } from "@/lib/tempo";
import { formatarReal } from "@/lib/dinheiro";
import { BotaoLink, Cartao, Etiqueta } from "@/components/ui";
import { ESTOQUE_ATIVO } from "@/lib/recursos";
import { resumoDoEstoque } from "@/lib/estoque";

export default async function Inicio() {
  await exigirSessao();
  // Sem isto o Next pré-renderiza esta página no build e ela serve dados
  // congelados: nada aqui usa cookies/params, então ele a considera estática.
  await connection();

  const hoje = hojeEmSaoPaulo();

  const [doDia, proximos, clientes, servicos, estoque] = await Promise.all([
    resumoDoDia(hoje),
    proximosAtendimentos(5),
    prisma.cliente.count(),
    prisma.servico.count({ where: { ativo: true } }),
    // Com o estoque desligado, nem consulta o banco por isso.
    ESTOQUE_ATIVO ? resumoDoEstoque() : null,
  ]);
  const deHoje = doDia.atendimentos.filter((a) => a.status !== "CANCELADO");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-texto">Início</h1>
          <p className="mt-0.5 text-sm text-texto-fraco">
            {deHoje.length === 0
              ? "Nenhum atendimento hoje"
              : `${deHoje.length} atendimento${deHoje.length > 1 ? "s" : ""} hoje · ${formatarReal(doDia.previsto)}`}
          </p>
        </div>
        <BotaoLink href="/agenda/novo">Marcar atendimento</BotaoLink>
      </div>

      {deHoje.length > 0 && (
        <Cartao className="mb-6 divide-y divide-borda-suave">
          {deHoje.map((a) => (
            <Link
              key={a.id}
              href={`/agenda/${a.id}`}
              className="flex items-center gap-4 px-5 py-3 transition hover:bg-superficie-suave"
            >
              <span className="w-12 shrink-0 font-mono text-sm font-semibold text-texto">{hora(a.inicio)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-texto">
                {a.cliente.nome}
                <span className="text-texto-fraco"> · {a.servico.nome}</span>
              </span>
              {a.local === "DOMICILIO" && <Etiqueta>domicílio</Etiqueta>}
            </Link>
          ))}
        </Cartao>
      )}

      {deHoje.length === 0 && proximos.length > 0 && (
        <Cartao className="mb-6 p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-texto-fraco">A seguir</h2>
          <div className="space-y-2">
            {proximos.map((a) => (
              <Link
                key={a.id}
                href={`/agenda/${a.id}`}
                className="flex items-center gap-3 text-sm transition hover:text-marca"
              >
                <span className="w-28 shrink-0 font-mono text-texto-fraco">
                  {dataCurta(a.inicio)} {hora(a.inicio)}
                </span>
                <span className="min-w-0 flex-1 truncate text-texto">{a.cliente.nome}</span>
              </Link>
            ))}
          </div>
        </Cartao>
      )}

      <div className={`grid gap-4 ${estoque ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {[
          { href: "/clientes", rotulo: "Clientes", valor: clientes, sufixo: clientes === 1 ? "cadastrada" : "cadastradas", alerta: false },
          { href: "/servicos", rotulo: "Serviços", valor: servicos, sufixo: servicos === 1 ? "ativo" : "ativos", alerta: false },
          ...(estoque
            ? [{
                href: "/produtos" as const,
                rotulo: "Produtos",
                valor: estoque.total,
                sufixo: estoque.aRepor > 0 ? `${estoque.aRepor} para repor` : "em estoque",
                alerta: estoque.aRepor > 0,
              }]
            : []),
        ].map((a) => (
          <Link key={a.href} href={a.href} className="group">
            <Cartao className="h-full p-5 transition group-hover:border-marca group-hover:shadow-md">
              <p className="text-sm font-medium text-texto-suave">{a.rotulo}</p>
              <p className="mt-2 text-3xl font-semibold text-texto">{a.valor}</p>
              <p className={`mt-0.5 text-sm ${a.alerta ? "text-atencao" : "text-texto-fraco"}`}>{a.sufixo}</p>
            </Cartao>
          </Link>
        ))}
      </div>
    </>
  );
}
