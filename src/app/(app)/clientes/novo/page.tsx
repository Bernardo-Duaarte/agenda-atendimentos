import { criarCliente } from "../acoes";
import { FormularioCliente } from "../formulario";
import { Titulo } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";

export default async function NovaCliente() {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  return (
    <>
      <Titulo>Nova cliente</Titulo>
      <FormularioCliente acao={criarCliente} />
    </>
  );
}
