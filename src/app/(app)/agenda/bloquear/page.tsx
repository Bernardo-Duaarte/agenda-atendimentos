import { exigirSessao } from "@/lib/sessao";
import { hojeEmSaoPaulo } from "@/lib/agenda-consulta";
import { Titulo } from "@/components/ui";
import { criarBloqueio } from "../acoes-bloqueio";
import { FormularioBloqueio } from "./formulario";

export default async function PaginaBloquear(props: PageProps<"/agenda/bloquear">) {
  // Verificada de novo aqui, e não só no layout: numa navegação pelo
  // cliente o Next pode renderizar só este trecho, sem passar pelo layout.
  await exigirSessao();

  const { d } = await props.searchParams;
  const dia = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hojeEmSaoPaulo();

  return (
    <>
      <Titulo>Bloquear horário</Titulo>
      <p className="-mt-3 mb-6 max-w-prose text-sm text-texto-fraco">
        Reserva um período seu sem criar atendimento nenhum — então não entra no faturamento nem
        no relatório. Serve para folga, viagem, médico ou o almoço.
      </p>
      <FormularioBloqueio acao={criarBloqueio} dataInicial={dia} />
    </>
  );
}
