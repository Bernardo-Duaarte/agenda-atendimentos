import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { criarAtendimento } from "../acoes";
import { FormularioAtendimento } from "../formulario";
import { Titulo } from "@/components/ui";
import { paraCampoReal } from "@/lib/dinheiro";
import { hojeEmSaoPaulo } from "@/lib/agenda-consulta";

export default async function NovoAtendimento(props: PageProps<"/agenda/novo">) {
  await exigirSessao();

  const { d } = await props.searchParams;
  const dia = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hojeEmSaoPaulo();

  const [clientes, servicos] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, enderecoPadrao: true },
    }),
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, precoCentavos: true, duracaoMin: true, percentualSinal: true },
    }),
  ]);

  return (
    <>
      <Titulo>Marcar atendimento</Titulo>
      <FormularioAtendimento
        acao={criarAtendimento}
        clientes={clientes}
        servicos={servicos.map((s) => ({
          id: s.id,
          nome: s.nome,
          duracaoMin: s.duracaoMin,
          precoReais: paraCampoReal(s.precoCentavos),
          percentualSinal: s.percentualSinal,
        }))}
        // Só para o campo de data já vir preenchido com o dia que estava sendo
        // olhado na agenda; o resto do formulário nasce em branco.
        dataInicial={dia}
      />
    </>
  );
}
