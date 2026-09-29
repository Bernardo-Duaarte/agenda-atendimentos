"use client";

import { useActionState } from "react";
import { Aviso, Campo, Cartao, Entrada } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";
import { NOMES_DOS_DIAS, diasDaJanela } from "@/lib/precificacao";

export type ConfiguracaoAtual = {
  nomeProfissional: string;
  telefone: string;
  enderecoEstudio: string | null;
  horaAbertura: string;
  horaFechamento: string;
  diasNormais: string;
  calendarioExternoUrl: string | null;
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

      </Cartao>

      <Cartao className="space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            Horário de trabalho
          </h2>
          <p className="mt-1 text-sm text-texto-fraco">
            Também define <strong className="text-texto-suave">quando vale o preço normal</strong>.
            Um atendimento que começa fora daqui cobra o preço diferenciado do serviço, quando ele
            tiver um.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Começa às" erro={erro("horaAbertura")}>
            <Entrada type="time" name="horaAbertura" defaultValue={atual.horaAbertura} erro={!!erro("horaAbertura")} />
          </Campo>
          <Campo rotulo="Termina às" erro={erro("horaFechamento")}>
            <Entrada type="time" name="horaFechamento" defaultValue={atual.horaFechamento} erro={!!erro("horaFechamento")} />
          </Campo>
        </div>

        <Campo rotulo="Dias de trabalho" erro={erro("diasNormais")}>
          <div className="flex flex-wrap gap-2 pt-1">
            {NOMES_DOS_DIAS.map((d) => (
              <label
                key={d.numero}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-borda px-3 py-2 text-sm text-texto-suave transition hover:bg-superficie-suave has-checked:border-marca has-checked:text-texto"
              >
                <input
                  type="checkbox"
                  name="diasNormais"
                  value={d.numero}
                  defaultChecked={diasDaJanela(atual.diasNormais).includes(d.numero)}
                  className="accent-acao"
                />
                {d.longo}
              </label>
            ))}
          </div>
        </Campo>
      </Cartao>

      <Cartao className="space-y-5 p-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-fraco">
            Sua agenda pessoal
          </h2>
          <p className="mt-1 text-sm text-texto-fraco">
            Os compromissos do seu calendário aparecem junto na agenda e avisam quando você tenta
            marcar em cima. É só leitura — o iPhone não deixa nenhum site escrever no Calendário.
          </p>
          <p className="mt-2 text-sm text-texto-fraco">
            No iPhone: Calendário → toque no ⓘ do calendário → <strong className="text-texto-suave">Calendário
            Público</strong> → copie o link e cole aqui. Quem tiver esse link vê esse calendário,
            então use um só com o que não for íntimo.
          </p>
        </div>

        <Campo rotulo="Link do calendário publicado" erro={erro("calendarioExternoUrl")} dica="Começa com webcal:// ou https://">
          <Entrada
            name="calendarioExternoUrl"
            defaultValue={atual.calendarioExternoUrl ?? ""}
            placeholder="webcal://p00-calendars.icloud.com/published/..."
          />
        </Campo>
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
