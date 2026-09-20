import { criarProduto } from "../acoes";
import { FormularioProduto } from "../formulario";
import { Titulo } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";
import { ESTOQUE_ATIVO } from "@/lib/recursos";
import { redirect } from "next/navigation";

export default async function NovoProduto() {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();
  // Endereço guardado nos favoritos não deve abrir uma tela que saiu do app.
  if (!ESTOQUE_ATIVO) redirect("/");

  return (
    <>
      <Titulo>Novo produto</Titulo>
      <FormularioProduto acao={criarProduto} />
    </>
  );
}
