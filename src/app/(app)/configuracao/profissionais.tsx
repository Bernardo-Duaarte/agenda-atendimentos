"use client";

import { useActionState } from "react";
import { Aviso, Campo, Cartao, Entrada } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

export type ParceiraNaTela = {
  id: string;
  nome: string;
  precoReais: string;
  repasseReais: string;
};

export function FormularioProfissionais({
  acao,
  parceiras,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  parceiras: ParceiraNaTela[];
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);

  // Uma linha em branco no fim é o espaço para acrescentar alguém, sem
  // precisar de um botão "adicionar" que recarregaria a tela.
  const linhas = [...parceiras, { id: "", nome: "", precoReais: "", repasseReais: "" }];

  return (
    <Cartao className="space-y-5 p-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-texto-fraco">
          Penteadistas parceiras
        </h2>
        <p className="mt-1 text-sm text-texto-fraco">
          Quando o serviço é de parceira, o preço vem daqui e a agenda ocupada é a dela — você
          fica livre para atender outra cliente no mesmo horário.
        </p>
      </div>

      <form action={enviar} className="space-y-4">
        {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}
        {Object.values(estado.erros ?? {}).map((e) => (
          <Aviso key={e}>{e}</Aviso>
        ))}

        <div className="hidden gap-4 text-xs font-medium uppercase tracking-wide text-texto-fraco sm:grid sm:grid-cols-[1fr_8rem_8rem]">
          <span>Nome</span>
          <span>Cliente paga</span>
          <span>Você repassa</span>
        </div>

        {linhas.map((p, i) => (
          <div key={p.id || "nova"} className="grid gap-4 sm:grid-cols-[1fr_8rem_8rem]">
            <input type="hidden" name="id" value={p.id} />
            <Campo rotulo={i === linhas.length - 1 ? "Acrescentar parceira" : ""}>
              <Entrada name="nome" defaultValue={p.nome} placeholder="Nome" />
            </Campo>
            <Campo rotulo="">
              <Entrada
                name="precoCentavos"
                defaultValue={p.precoReais}
                inputMode="decimal"
                placeholder="150,00"
              />
            </Campo>
            <Campo rotulo="">
              <Entrada
                name="repasseCentavos"
                defaultValue={p.repasseReais}
                inputMode="decimal"
                placeholder="igual ao preço"
              />
            </Campo>
          </div>
        ))}

        <p className="text-sm text-texto-fraco">
          Deixe o repasse igual ao preço quando você não fica com nada; a diferença entre os dois
          é o que sobra para você.
        </p>

        <BotaoSubmit>Salvar parceiras</BotaoSubmit>
      </form>
    </Cartao>
  );
}
