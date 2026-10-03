import { criarCliente } from "../acoes";
import { FormularioCliente } from "../formulario";
import { Titulo } from "@/components/ui";
import { exigirSessao } from "@/lib/sessao";

export default async function NovaCliente(props: PageProps<"/clientes/novo">) {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  // Vindos de "não achei ninguém com esse nome" na lista: o que foi digitado
  // na busca já chega preenchido, para não redigitar.
  const { nome, telefone } = await props.searchParams;

  return (
    <>
      <Titulo>Nova cliente</Titulo>
      <FormularioCliente
        acao={criarCliente}
        inicial={{
          nome: typeof nome === "string" ? nome.slice(0, 120) : "",
          telefone: typeof telefone === "string" ? telefone.replace(/\D/g, "").slice(0, 13) : "",
        }}
      />
    </>
  );
}
