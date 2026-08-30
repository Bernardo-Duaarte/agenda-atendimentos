import { criarProduto } from "../acoes";
import { FormularioProduto } from "../formulario";
import { Titulo } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";

export default async function NovoProduto() {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  return (
    <>
      <Titulo>Novo produto</Titulo>
      <FormularioProduto acao={criarProduto} />
    </>
  );
}
