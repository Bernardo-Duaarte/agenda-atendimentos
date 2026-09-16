import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { salvarConfiguracao } from "./acoes";
import { FormularioConfiguracao } from "./formulario";
import { Cartao, Titulo } from "@/components/ui";
import { paraCampoReal } from "@/lib/dinheiro";

const PADRAO = {
  nomeProfissional: "",
  telefone: "",
  enderecoEstudio: null,
  horaAbertura: "09:00",
  horaFechamento: "19:00",
  taxaBaseCentavos: 0,
  taxaPorKmCentavos: 0,
  taxaPorMinutoCentavos: 0,
};

export default async function PaginaConfiguracao(props: PageProps<"/configuracao">) {
  await exigirSessao();
  const { salvo } = await props.searchParams;

  const config = (await prisma.configuracao.findUnique({ where: { id: "unica" } })) ?? PADRAO;

  return (
    <>
      <Titulo>Configuração</Titulo>

      {salvo === "1" && (
        <Cartao className="mb-6 border-positivo/40 bg-positivo-fundo p-4">
          <p className="text-sm font-medium text-positivo-texto">Configuração salva.</p>
        </Cartao>
      )}

      <FormularioConfiguracao
        acao={salvarConfiguracao}
        temChaveDoMapa={Boolean(process.env.GOOGLE_MAPS_API_KEY)}
        atual={{
          nomeProfissional: config.nomeProfissional,
          telefone: config.telefone,
          enderecoEstudio: config.enderecoEstudio,
          horaAbertura: config.horaAbertura,
          horaFechamento: config.horaFechamento,
          taxaBaseReais: paraCampoReal(config.taxaBaseCentavos),
          taxaPorKmReais: paraCampoReal(config.taxaPorKmCentavos),
          taxaPorMinutoReais: paraCampoReal(config.taxaPorMinutoCentavos),
        }}
      />
    </>
  );
}
