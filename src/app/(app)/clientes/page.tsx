import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatarTelefone, linkWhatsApp } from "@/lib/whatsapp";
import { Aviso, BotaoLink, Cartao, Entrada, Etiqueta, Titulo, Vazio } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaClientes(props: PageProps<"/clientes">) {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  const { q, erro } = await props.searchParams;
  const busca = typeof q === "string" ? q.trim() : "";

  const clientes = await prisma.cliente.findMany({
    where: busca
      ? {
          OR: [
            { nome: { contains: busca, mode: "insensitive" } },
            { telefone: { contains: busca.replace(/\D/g, "") } },
          ],
        }
      : undefined,
    orderBy: { nome: "asc" },
    include: { _count: { select: { agendamentos: true } } },
  });

  return (
    <>
      <Titulo acao={<BotaoLink href="/clientes/novo">Nova cliente</BotaoLink>}>Clientes</Titulo>

      {typeof erro === "string" && <Aviso>{erro}</Aviso>}

      <form className="mb-5">
        <Entrada
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome ou telefone..."
          aria-label="Buscar cliente"
        />
      </form>

      {clientes.length === 0 ? (
        <Vazio
          titulo={busca ? "Nenhuma cliente encontrada" : "Nenhuma cliente cadastrada"}
          descricao={
            busca
              ? `Nada bate com "${busca}". Tente parte do nome ou só o DDD.`
              : "Cadastre a primeira e ela já fica disponível na hora de marcar um atendimento."
          }
          acao={!busca && <BotaoLink href="/clientes/novo">Cadastrar cliente</BotaoLink>}
        />
      ) : (
        <Cartao className="divide-y divide-zinc-100">
          {clientes.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/clientes/${c.id}`} className="font-medium text-zinc-900 hover:text-rose-700">
                    {c.nome}
                  </Link>
                  {c.alergias && <Etiqueta tom="alerta">alergia</Etiqueta>}
                  {c._count.agendamentos > 0 && (
                    <Etiqueta>
                      {c._count.agendamentos} atendimento{c._count.agendamentos > 1 ? "s" : ""}
                    </Etiqueta>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-zinc-500">
                  {formatarTelefone(c.telefone)}
                  {c.tomPele && ` · ${c.tomPele}`}
                </p>
              </div>

              <a
                href={linkWhatsApp(c.telefone, `Oi, ${c.nome.split(" ")[0]}!`)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                WhatsApp
              </a>
            </div>
          ))}
        </Cartao>
      )}
    </>
  );
}
