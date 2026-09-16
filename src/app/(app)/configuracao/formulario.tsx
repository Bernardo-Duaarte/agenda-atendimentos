"use client";

import { useActionState } from "react";
import { Aviso, Campo, Cartao, Entrada } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

export type ConfiguracaoAtual = {
  nomeProfissional: string;
  telefone: string;
  enderecoEstudio: string | null;
  horaAbertura: string;
  horaFechamento: string;
  taxaBaseReais: string;
  taxaPorKmReais: string;
  taxaPorMinutoReais: string;
};

export function FormularioConfiguracao({
  acao,
  atual,
  temChaveDoMapa,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  atual: ConfiguracaoAtual;
  temChaveDoMapa: boolean;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const erro = (campo: string) => estado.erros?.[campo];

  return (
    <form action={enviar} className="space-y-6">
      {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}

      <Cartao className="space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-fraco">Você</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Seu nome" erro={erro("nomeProfissional")}>
            <Entrada name="nomeProfissional" defaultValue={atual.nomeProfissional} placeholder="Como aparece para as clientes" />
          </Campo>

          <Campo rotulo="Seu telefone" erro={erro("telefone")}>
            <Entrada name="telefone" defaultValue={atual.telefone} inputMode="tel" placeholder="(11) 99999-9999" />
          </Campo>
        </div>

        <Campo
          rotulo="Endereço do estúdio"
          erro={erro("enderecoEstudio")}
          dica="Completo, com cidade — é o ponto de partida do cálculo de deslocamento e o endereço que aparece no seu calendário."
        >
          <Entrada
            name="enderecoEstudio"
            defaultValue={atual.enderecoEstudio ?? ""}
            placeholder="Rua, número, bairro, cidade"
          />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Começo do dia" erro={erro("horaAbertura")}>
            <Entrada type="time" name="horaAbertura" defaultValue={atual.horaAbertura} erro={!!erro("horaAbertura")} />
          </Campo>
          <Campo rotulo="Fim do dia" erro={erro("horaFechamento")}>
            <Entrada type="time" name="horaFechamento" defaultValue={atual.horaFechamento} erro={!!erro("horaFechamento")} />
          </Campo>
        </div>
      </Cartao>

      <Cartao className="space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            Taxa de deslocamento
          </h2>
          <p className="mt-1 text-sm text-texto-fraco">
            Como transformar distância e tempo em valor cobrado, no formato em que o Uber cobra.
            Vale por trecho — o sistema dobra para ida e volta.
          </p>
          <p className="mt-2 text-sm text-texto-fraco">
            É <strong className="text-texto-suave">estimativa</strong>, não consulta: o Uber não
            abre os preços dele para outros sistemas. Compare com o que o aplicativo cobrou de
            verdade e ajuste estes números até chegarem perto.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Campo rotulo="Valor base" erro={erro("taxaBaseCentavos")} dica="A bandeirada de cada corrida.">
            <Entrada
              name="taxaBaseCentavos"
              defaultValue={atual.taxaBaseReais}
              erro={!!erro("taxaBaseCentavos")}
              inputMode="decimal"
              placeholder="7,00"
            />
          </Campo>
          <Campo rotulo="Por quilômetro" erro={erro("taxaPorKmCentavos")}>
            <Entrada
              name="taxaPorKmCentavos"
              defaultValue={atual.taxaPorKmReais}
              erro={!!erro("taxaPorKmCentavos")}
              inputMode="decimal"
              placeholder="2,20"
            />
          </Campo>
          <Campo rotulo="Por minuto" erro={erro("taxaPorMinutoCentavos")} dica="É o que cobre o trânsito.">
            <Entrada
              name="taxaPorMinutoCentavos"
              defaultValue={atual.taxaPorMinutoReais}
              erro={!!erro("taxaPorMinutoCentavos")}
              inputMode="decimal"
              placeholder="0,50"
            />
          </Campo>
        </div>

        {!temChaveDoMapa && (
          <Aviso>
            O cálculo automático de distância está desligado porque falta a chave do Google Maps
            no servidor. Os campos de ida, volta e taxa continuam funcionando preenchidos à mão.
          </Aviso>
        )}
      </Cartao>

      <BotaoSubmit>Salvar configuração</BotaoSubmit>
    </form>
  );
}
