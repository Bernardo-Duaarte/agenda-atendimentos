"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AreaTexto, Aviso, Campo, Cartao, Entrada, Selecao } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";

export type ClienteOpcao = { id: string; nome: string; enderecoPadrao: string | null };
export type ServicoOpcao = { id: string; nome: string; precoReais: string; duracaoMin: number };

export type AtendimentoEmEdicao = {
  id: string;
  clienteId: string;
  servicoId: string;
  data: string;
  hora: string;
  local: "ESTUDIO" | "DOMICILIO";
  endereco: string | null;
  deslocamentoIdaMin: number;
  deslocamentoVoltaMin: number;
  taxaReais: string;
  precoReais: string;
  observacoes: string | null;
};

export function FormularioAtendimento({
  acao,
  clientes,
  servicos,
  atendimento,
  dataInicial,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  clientes: ClienteOpcao[];
  servicos: ServicoOpcao[];
  atendimento?: AtendimentoEmEdicao;
  /** Deixa o campo de data já preenchido ao marcar a partir de um dia da agenda. */
  dataInicial?: string;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const erro = (campo: string) => estado.erros?.[campo];

  const [clienteId, setClienteId] = useState(atendimento?.clienteId ?? "");
  const [servicoId, setServicoId] = useState(atendimento?.servicoId ?? servicos[0]?.id ?? "");
  const [local, setLocal] = useState<"ESTUDIO" | "DOMICILIO">(atendimento?.local ?? "ESTUDIO");
  const [preco, setPreco] = useState(atendimento?.precoReais ?? servicos[0]?.precoReais ?? "");
  const [endereco, setEndereco] = useState(atendimento?.endereco ?? "");

  const servico = servicos.find((s) => s.id === servicoId);
  const cliente = clientes.find((c) => c.id === clienteId);

  /** Trocar de serviço traz o preço da tabela — que continua editável. */
  function escolherServico(id: string) {
    setServicoId(id);
    const s = servicos.find((x) => x.id === id);
    if (s) setPreco(s.precoReais);
  }

  /** Ao ir para domicílio, sugere o endereço que a cliente já tem cadastrado. */
  function escolherLocal(novo: "ESTUDIO" | "DOMICILIO") {
    setLocal(novo);
    if (novo === "DOMICILIO" && !endereco && cliente?.enderecoPadrao) {
      setEndereco(cliente.enderecoPadrao);
    }
  }

  function escolherCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (local === "DOMICILIO" && !endereco && c?.enderecoPadrao) setEndereco(c.enderecoPadrao);
  }

  if (clientes.length === 0 || servicos.length === 0) {
    return (
      <Cartao className="p-6">
        <p className="text-sm text-texto-suave">
          Para marcar um atendimento você precisa de pelo menos{" "}
          {clientes.length === 0 && (
            <Link href="/clientes/novo" className="font-medium text-marca underline underline-offset-2">
              uma cliente
            </Link>
          )}
          {clientes.length === 0 && servicos.length === 0 && " e "}
          {servicos.length === 0 && (
            <Link href="/servicos/novo" className="font-medium text-marca underline underline-offset-2">
              um serviço
            </Link>
          )}{" "}
          cadastrado.
        </p>
      </Cartao>
    );
  }

  return (
    <form action={enviar} className="space-y-6">
      {atendimento && <input type="hidden" name="id" value={atendimento.id} />}
      {estado.erroGeral && <Aviso>{estado.erroGeral}</Aviso>}

      <Cartao className="space-y-5 p-6">
        <Campo rotulo="Cliente" erro={erro("clienteId")}>
          <Selecao
            name="clienteId"
            value={clienteId}
            onChange={(e) => escolherCliente(e.target.value)}
            erro={!!erro("clienteId")}
          >
            <option value="">Escolha…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </Selecao>
        </Campo>

        <Campo
          rotulo="Serviço"
          erro={erro("servicoId")}
          dica={servico ? `Dura ${servico.duracaoMin} minutos.` : undefined}
        >
          <Selecao name="servicoId" value={servicoId} onChange={(e) => escolherServico(e.target.value)}>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </Selecao>
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Data" erro={erro("data")}>
            <Entrada
              type="date"
              name="data"
              defaultValue={atendimento?.data ?? dataInicial}
              erro={!!erro("data")}
              required
            />
          </Campo>

          <Campo
            rotulo="Hora de início"
            erro={erro("hora")}
            dica={servico ? `Termina ${servico.duracaoMin} min depois.` : undefined}
          >
            <Entrada type="time" name="hora" defaultValue={atendimento?.hora} erro={!!erro("hora")} required />
          </Campo>
        </div>
      </Cartao>

      <Cartao className="space-y-5 p-6">
        <Campo rotulo="Onde vai ser" erro={erro("local")}>
          <Selecao name="local" value={local} onChange={(e) => escolherLocal(e.target.value as typeof local)}>
            <option value="ESTUDIO">No estúdio</option>
            <option value="DOMICILIO">Em domicílio</option>
          </Selecao>
        </Campo>

        {local === "DOMICILIO" && (
          <>
            <Campo
              rotulo="Endereço"
              erro={erro("endereco")}
              dica={cliente?.enderecoPadrao ? "Sugerido do cadastro da cliente." : undefined}
            >
              <Entrada
                name="endereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                erro={!!erro("endereco")}
                placeholder="Rua, número, bairro"
              />
            </Campo>

            <div className="grid gap-5 sm:grid-cols-3">
              <Campo rotulo="Ida (min)" erro={erro("deslocamentoIdaMin")} dica="Bloqueia antes.">
                <Entrada
                  name="deslocamentoIdaMin"
                  defaultValue={atendimento?.deslocamentoIdaMin ?? 30}
                  erro={!!erro("deslocamentoIdaMin")}
                  inputMode="numeric"
                />
              </Campo>
              <Campo rotulo="Volta (min)" erro={erro("deslocamentoVoltaMin")} dica="Bloqueia depois.">
                <Entrada
                  name="deslocamentoVoltaMin"
                  defaultValue={atendimento?.deslocamentoVoltaMin ?? 30}
                  erro={!!erro("deslocamentoVoltaMin")}
                  inputMode="numeric"
                />
              </Campo>
              <Campo rotulo="Taxa cobrada" erro={erro("taxaDeslocamentoCentavos")}>
                <Entrada
                  name="taxaDeslocamentoCentavos"
                  defaultValue={atendimento?.taxaReais ?? "0"}
                  erro={!!erro("taxaDeslocamentoCentavos")}
                  inputMode="decimal"
                />
              </Campo>
            </div>
          </>
        )}

        {local === "ESTUDIO" && (
          <>
            <input type="hidden" name="deslocamentoIdaMin" value="0" />
            <input type="hidden" name="deslocamentoVoltaMin" value="0" />
            <input type="hidden" name="taxaDeslocamentoCentavos" value="0" />
          </>
        )}
      </Cartao>

      <Cartao className="space-y-5 p-6">
        <Campo
          rotulo="Preço do atendimento"
          erro={erro("precoCentavos")}
          dica="Vem da tabela do serviço, mas você pode ajustar. O valor fica congelado neste atendimento."
        >
          <Entrada
            name="precoCentavos"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            erro={!!erro("precoCentavos")}
            inputMode="decimal"
          />
        </Campo>

        <Campo rotulo="Observações" erro={erro("observacoes")} dica="Opcional.">
          <AreaTexto
            name="observacoes"
            defaultValue={atendimento?.observacoes ?? ""}
            placeholder="Ex: levar paleta de tons frios"
          />
        </Campo>
      </Cartao>

      <div className="flex items-center gap-3">
        <BotaoSubmit>{atendimento ? "Salvar alterações" : "Marcar atendimento"}</BotaoSubmit>
        <Link href="/agenda" className="text-sm font-medium text-texto-suave hover:text-texto">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
