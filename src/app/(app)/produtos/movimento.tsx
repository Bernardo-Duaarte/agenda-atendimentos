"use client";

import { useActionState, useState } from "react";
import { Aviso, Campo, Cartao, Entrada, Selecao } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

const TIPOS = [
  { valor: "ENTRADA", rotulo: "Entrada — comprei mais" },
  { valor: "PERDA", rotulo: "Perda — venceu, quebrou, derramou" },
  { valor: "AJUSTE", rotulo: "Ajuste — corrigir após contagem" },
];

export function FormularioMovimento({
  acao,
  produtoId,
  unidade,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  produtoId: string;
  unidade: string;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const [tipo, setTipo] = useState("ENTRADA");
  const erro = (campo: string) => estado.erros?.[campo];

  return (
    <Cartao className="p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-texto-fraco">
        Lançar movimento
      </h2>
      <p className="mb-5 text-sm text-texto-fraco">
        O consumo dos atendimentos entra sozinho — aqui é só compra, perda e correção.
      </p>

      <form action={enviar} className="space-y-5">
        <input type="hidden" name="produtoId" value={produtoId} />
        {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}

        <Campo rotulo="O que aconteceu" erro={erro("tipo")}>
          <Selecao name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo={`Quantidade (${unidade})`}
            erro={erro("quantidade")}
            dica={tipo === "AJUSTE" ? "Use o quanto falta ou sobra, não o total contado." : undefined}
          >
            <Entrada name="quantidade" erro={!!erro("quantidade")} inputMode="decimal" placeholder="1" />
          </Campo>

          {tipo === "ENTRADA" && (
            <Campo
              rotulo="Quanto pagou no total"
              erro={erro("custoTotalCentavos")}
              dica="Pela compra inteira. Redefine o custo por unidade do produto."
            >
              <Entrada
                name="custoTotalCentavos"
                erro={!!erro("custoTotalCentavos")}
                inputMode="decimal"
                placeholder="229,00"
              />
            </Campo>
          )}
        </div>

        <Campo rotulo="Observação" erro={erro("observacao")} dica="Opcional. Ajuda a lembrar depois.">
          <Entrada name="observacao" placeholder="Ex: comprei na promoção da loja X" />
        </Campo>

        <BotaoSubmit enviando="Lançando...">Lançar</BotaoSubmit>
      </form>
    </Cartao>
  );
}
