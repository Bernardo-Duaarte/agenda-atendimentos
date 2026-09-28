import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { criarAtendimento } from "../acoes";
import { FormularioAtendimento } from "../formulario";
import { Titulo } from "@/components/ui";
import { janelaComDescricao } from "@/lib/janela";
import { hojeEmSaoPaulo } from "@/lib/agenda-consulta";

export default async function NovoAtendimento(props: PageProps<"/agenda/novo">) {
  await exigirSessao();

  const { d } = await props.searchParams;
  const dia = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : hojeEmSaoPaulo();

  const [clientes, servicos, { janela, descricao }, profissionais] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, enderecoPadrao: true },
    }),
    prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: {
        id: true, nome: true, precoCentavos: true, duracaoMin: true,
        percentualSinal: true,
        acrescimoDomicilioCentavos: true, acrescimoForaHorarioCentavos: true,
        exigeProfissional: true,
      },
    }),
    janelaComDescricao(),
    prisma.profissional.findMany({
      where: { ativo: true },
      orderBy: { precoCentavos: "asc" },
      select: { id: true, nome: true, precoCentavos: true, repasseCentavos: true },
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
          percentualSinal: s.percentualSinal,
          precoCentavos: s.precoCentavos,
          acrescimoDomicilioCentavos: s.acrescimoDomicilioCentavos,
          acrescimoForaHorarioCentavos: s.acrescimoForaHorarioCentavos,
          exigeProfissional: s.exigeProfissional,
        }))}
        // Só para o campo de data já vir preenchido com o dia que estava sendo
        // olhado na agenda; o resto do formulário nasce em branco.
        dataInicial={dia}
        profissionais={profissionais}
        janela={janela}
        descricaoJanela={descricao}
      />
    </>
  );
}
