"use client";

import { useActionState, useState } from "react";
import { Aviso, Campo, Cartao, Entrada, Selecao } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";
import { ROTULO_FORMA, ROTULO_TIPO_PAGAMENTO } from "@/lib/financeiro";

export function FormularioPagamento({
  acao,
  agendamentoId,
  sinalSugerido,
  restanteSugerido,
  hoje,
  agora,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  agendamentoId: string;
  /** Quanto falta do sinal, para preencher o campo sem você fazer conta. */
  sinalSugerido: string;
  /** Quanto falta no total. */
  restanteSugerido: string;
  hoje: string;
  agora: string;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const erro = (campo: string) => estado.erros?.[campo];

  const [tipo, setTipo] = useState<keyof typeof ROTULO_TIPO_PAGAMENTO>("SINAL");
  const [valor, setValor] = useState(sinalSugerido);

  /** Trocar o tipo traz o valor que faz sentido para ele. */
  function escolherTipo(novo: keyof typeof ROTULO_TIPO_PAGAMENTO) {
    setTipo(novo);
    if (novo === "SINAL") setValor(sinalSugerido);
    else if (novo === "RESTANTE") setValor(restanteSugerido);
    else setValor("");
  }

  return (
    <Cartao className="p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
        Registrar recebimento
      </h2>
      <p className="mb-5 text-sm text-texto-fraco">
        Assim que o sinal for coberto, o atendimento passa a confirmado sozinho.
      </p>

      <form action={enviar} className="space-y-5">
        <input type="hidden" name="agendamentoId" value={agendamentoId} />
        {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="O que é" erro={erro("tipo")}>
            <Selecao
              name="tipo"
              value={tipo}
              onChange={(e) => escolherTipo(e.target.value as typeof tipo)}
            >
              {Object.entries(ROTULO_TIPO_PAGAMENTO).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </Selecao>
          </Campo>

          <Campo
            rotulo="Valor"
            erro={erro("valorCentavos")}
            dica={tipo === "DEVOLUCAO" ? "Digite positivo; o sistema desconta." : undefined}
          >
            <Entrada
              name="valorCentavos"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              erro={!!erro("valorCentavos")}
              inputMode="decimal"
              placeholder="0,00"
            />
          </Campo>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Campo rotulo="Como" erro={erro("forma")}>
            <Selecao name="forma" defaultValue="PIX">
              {Object.entries(ROTULO_FORMA).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </Selecao>
          </Campo>

          <Campo rotulo="Data" erro={erro("data")} dica="Quando o dinheiro entrou.">
            <Entrada type="date" name="data" defaultValue={hoje} erro={!!erro("data")} required />
          </Campo>

          <Campo rotulo="Hora" erro={erro("hora")}>
            <Entrada type="time" name="hora" defaultValue={agora} erro={!!erro("hora")} required />
          </Campo>
        </div>

        <Campo rotulo="Observação" erro={erro("observacao")} dica="Opcional.">
          <Entrada name="observacao" placeholder="Ex: pagou adiantado no dia da prova" />
        </Campo>

        <BotaoSubmit enviando="Registrando...">Registrar</BotaoSubmit>
      </form>
    </Cartao>
  );
}
