import { prisma } from "@/lib/prisma";
import { Aviso, BotaoLink, Titulo } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";
import { ListaClientes } from "./lista";

export default async function PaginaClientes(props: PageProps<"/clientes">) {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  const { q, erro } = await props.searchParams;

  // A lista vem inteira e o filtro é na tela. Buscar no banco por nome não
  // ignora acento, e era isso que fazia "julia" não achar "Júlia".
  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      telefone: true,
      tomPele: true,
      alergias: true,
      _count: { select: { agendamentos: true } },
    },
  });

  return (
    <>
      <Titulo
        acao={
          <div className="flex flex-wrap gap-2">
            <BotaoLink href="/clientes/importar" variante="secundario">
              Importar contatos
            </BotaoLink>
            <BotaoLink href="/clientes/novo">Nova cliente</BotaoLink>
          </div>
        }
      >
        Clientes
      </Titulo>

      {typeof erro === "string" && <Aviso>{erro}</Aviso>}

      <ListaClientes
        clientes={clientes.map((c) => ({
          id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          tomPele: c.tomPele,
          alergias: c.alergias,
          atendimentos: c._count.agendamentos,
        }))}
        buscaInicial={typeof q === "string" ? q : ""}
      />
    </>
  );
}
