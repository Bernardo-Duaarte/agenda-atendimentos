"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Aviso, Campo, Cartao, Entrada } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

/**
 * Reservar um período seu na agenda.
 *
 * Dia inteiro esconde os horários em vez de desabilitá-los: campo desabilitado
 * continua ocupando a tela e faz pensar que falta preencher alguma coisa.
 */
export function FormularioBloqueio({
  acao,
  dataInicial,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  dataInicial: string;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const erro = (campo: string) => estado.erros?.[campo];

  const [diaInteiro, setDiaInteiro] = useState(false);

  // Quando há choque, a ação pede confirmação. Só então o aviso aparece — e
  // com ele a caixa de "mesmo assim", que não faz sentido antes disso.
  const choque = erro("geral");

  return (
    <form action={enviar} className="space-y-6">
      {choque && <Aviso>{choque}</Aviso>}

      <Cartao className="space-y-5 p-6">
        <Campo rotulo="Dia" erro={erro("data")}>
          <Entrada type="date" name="data" defaultValue={dataInicial} erro={!!erro("data")} required />
        </Campo>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-borda p-4 transition hover:bg-superficie-suave">
          <input
            type="checkbox"
            name="diaInteiro"
            checked={diaInteiro}
            onChange={(e) => setDiaInteiro(e.target.checked)}
            className="mt-0.5 accent-acao"
          />
          <span>
            <span className="block text-sm font-medium text-texto">O dia inteiro</span>
            <span className="mt-0.5 block text-sm text-texto-fraco">
              Para folga, viagem ou feriado. Sem isso, você escolhe o horário.
            </span>
          </span>
        </label>

        {!diaInteiro && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo rotulo="Das" erro={erro("horaInicio")}>
              <Entrada type="time" name="horaInicio" erro={!!erro("horaInicio")} required />
            </Campo>
            <Campo rotulo="Até" erro={erro("horaFim")}>
              <Entrada type="time" name="horaFim" erro={!!erro("horaFim")} required />
            </Campo>
          </div>
        )}

        <Campo rotulo="Motivo" erro={erro("motivo")} dica="Opcional. Aparece na agenda.">
          <Entrada name="motivo" placeholder="Férias, médico, almoço..." />
        </Campo>

        {choque && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-atencao-fundo bg-atencao-fundo p-4">
            <input type="checkbox" name="mesmoAssim" className="mt-0.5 accent-acao" />
            <span className="text-sm text-atencao-texto">
              Bloquear mesmo assim, por cima do atendimento
            </span>
          </label>
        )}
      </Cartao>

      <div className="flex items-center gap-3">
        <BotaoSubmit enviando="Bloqueando...">Bloquear</BotaoSubmit>
        <Link
          href={`/agenda?d=${dataInicial}`}
          className="text-sm font-medium text-texto-suave hover:text-texto"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
