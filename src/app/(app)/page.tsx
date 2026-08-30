import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { saldosPorProduto } from "@/lib/estoque";
import { Cartao } from "@/components/ui";
import { connection } from "next/server";
import { exigirSessao } from "@/lib/sessao";

export default async function Inicio() {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  // Sem isto o Next pré-renderiza esta página no build e ela serve dados
  // congelados: nada aqui usa cookies/params, então ele a considera estática.
  await connection();

  const [clientes, servicos, produtos, saldos] = await Promise.all([
    prisma.cliente.count(),
    prisma.servico.count({ where: { ativo: true } }),
    prisma.produto.findMany({ where: { ativo: true }, select: { id: true, estoqueMinimo: true } }),
    saldosPorProduto(),
  ]);

  const aRepor = produtos.filter(
    (p) => (saldos.get(p.id) ?? 0) <= Number(p.estoqueMinimo),
  ).length;

  const atalhos = [
    { href: "/clientes", rotulo: "Clientes", valor: clientes, sufixo: clientes === 1 ? "cadastrada" : "cadastradas" },
    { href: "/servicos", rotulo: "Serviços", valor: servicos, sufixo: servicos === 1 ? "ativo" : "ativos" },
    { href: "/produtos", rotulo: "Produtos", valor: produtos.length, sufixo: aRepor > 0 ? `${aRepor} para repor` : "em estoque" },
  ];

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-zinc-900">Início</h1>
      <p className="mb-8 text-zinc-500">Seus cadastros. A agenda entra aqui em seguida.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {atalhos.map((a) => (
          <Link key={a.href} href={a.href} className="group">
            <Cartao className="h-full p-5 transition group-hover:border-rose-300 group-hover:shadow-md">
              <p className="text-sm font-medium text-zinc-500">{a.rotulo}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900">{a.valor}</p>
              <p className={`mt-0.5 text-sm ${a.rotulo === "Produtos" && aRepor > 0 ? "text-amber-600" : "text-zinc-400"}`}>
                {a.sufixo}
              </p>
            </Cartao>
          </Link>
        ))}
      </div>

      <Cartao className="mt-8 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Ainda por vir</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600">
          <li>Agenda do dia e da semana, com bloqueio de horário considerando o deslocamento</li>
          <li>Criar atendimento e dar baixa no estoque ao concluir</li>
          <li>Lembrete pelo WhatsApp com a mensagem pronta</li>
          <li>Senha de acesso e assinatura da agenda no celular</li>
        </ul>
      </Cartao>
    </>
  );
}
