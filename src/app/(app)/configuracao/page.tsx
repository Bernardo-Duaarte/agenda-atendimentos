import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { salvarConfiguracao } from "./acoes";
import { FormularioConfiguracao } from "./formulario";
import { FormularioProfissionais } from "./profissionais";
import { salvarProfissionais } from "./acoes-profissionais";
import { Cartao, Titulo } from "@/components/ui";
import { paraCampoReal } from "@/lib/dinheiro";

const PADRAO = {
  nomeProfissional: "",
  telefone: "",
  enderecoEstudio: null,
  horaAbertura: "07:00",
  horaFechamento: "21:00",
  diasNormais: "1,2,3,4,5,6",
  calendarioExternoUrl: null,
  taxaBaseCentavos: 0,
  taxaPorKmCentavos: 0,
  taxaPorMinutoCentavos: 0,
};

export default async function PaginaConfiguracao(props: PageProps<"/configuracao">) {
  await exigirSessao();
  const { salvo } = await props.searchParams;

  const [config, parceiras] = await Promise.all([
    prisma.configuracao.findUnique({ where: { id: "unica" } }),
    prisma.profissional.findMany({ where: { ativo: true }, orderBy: { precoCentavos: "asc" } }),
  ]);
  const atual = config ?? PADRAO;

  return (
    <>
      <Titulo>Configuração</Titulo>

      {(salvo === "1" || salvo === "parceiras") && (
        <Cartao className="mb-6 border-positivo/40 bg-positivo-fundo p-4">
          <p className="text-sm font-medium text-positivo-texto">Configuração salva.</p>
        </Cartao>
      )}

      <FormularioConfiguracao
        acao={salvarConfiguracao}
        temChaveDoMapa={Boolean(process.env.GOOGLE_MAPS_API_KEY)}
        atual={{
          nomeProfissional: atual.nomeProfissional,
          telefone: atual.telefone,
          enderecoEstudio: atual.enderecoEstudio,
          horaAbertura: atual.horaAbertura,
          horaFechamento: atual.horaFechamento,
          diasNormais: atual.diasNormais,
          calendarioExternoUrl: atual.calendarioExternoUrl,
          taxaBaseReais: paraCampoReal(atual.taxaBaseCentavos),
          taxaPorKmReais: paraCampoReal(atual.taxaPorKmCentavos),
          taxaPorMinutoReais: paraCampoReal(atual.taxaPorMinutoCentavos),
        }}
      />

      <div className="mt-6">
        <FormularioProfissionais
          acao={salvarProfissionais}
          parceiras={parceiras.map((p) => ({
            id: p.id,
            nome: p.nome,
            precoReais: paraCampoReal(p.precoCentavos),
            repasseReais: paraCampoReal(p.repasseCentavos),
          }))}
        />
      </div>
    </>
  );
}
