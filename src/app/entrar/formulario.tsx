"use client";

import { useActionState } from "react";
import { Aviso, Campo, Entrada } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

export function FormularioEntrar({
  acao,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);

  return (
    <form action={enviar} className="space-y-5">
      {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}

      <Campo rotulo="Senha">
        <Entrada
          type="password"
          name="senha"
          autoFocus
          autoComplete="current-password"
          erro={!!estado.erroGeral}
          placeholder="Sua senha de acesso"
        />
      </Campo>

      <BotaoSubmit enviando="Entrando...">Entrar</BotaoSubmit>
    </form>
  );
}
