import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { BotaoLink, Titulo } from "@/components/ui";
import { ListaImportacao } from "./lista";

export default async function PaginaImportarContatos() {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  // Só os números, e nada mais. A tela precisa saber quem já está cadastrada
  // para não oferecer de novo; nome e ficha não fazem falta para isso.
  const existentes = await prisma.cliente.findMany({ select: { telefone: true } });

  return (
    <>
      <Titulo acao={<BotaoLink href="/clientes" variante="secundario">Voltar</BotaoLink>}>
        Importar contatos
      </Titulo>

      <ListaImportacao jaCadastrados={existentes.map((c) => c.telefone)} />
    </>
  );
}
