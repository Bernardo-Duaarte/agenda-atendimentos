"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { AreaTexto, Aviso, Campo, Cartao, Entrada, Selecao } from "@/components/ui";
import { BotaoSubmit } from "@/components/botao-submit";
import { SeletorCliente } from "@/components/seletor-cliente";
import { estadoInicial, type EstadoFormulario } from "@/lib/formulario";
import { calcularSinal } from "@/lib/financeiro";
import { calcularDeslocamento } from "./acao-deslocamento";
import { precoParaOHorario, type JanelaNormal } from "@/lib/precificacao";
import { paraCampoReal, paraCentavos } from "@/lib/dinheiro";
import { paraUtc } from "@/lib/tempo";

export type ClienteOpcao = {
  id: string;
  nome: string;
  /** Mostrado e buscável no seletor: dois nomes iguais se distinguem por ele. */
  telefone: string;
  enderecoPadrao: string | null;
};
export type ProfissionalOpcao = {
  id: string;
  nome: string;
  precoCentavos: number;
  repasseCentavos: number;
};
export type ServicoOpcao = {
  id: string;
  nome: string;
  duracaoMin: number;
  percentualSinal: number;
  /** Quando preenchido, o sinal é esse valor e não uma porcentagem. */
  sinalFixoCentavos: number | null;
  /** Em centavos: base e os acréscimos que podem somar. */
  precoCentavos: number;
  acrescimoDomicilioCentavos: number;
  acrescimoForaHorarioCentavos: number;
  exigeProfissional: boolean;
};

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
  sinalReais: string;
  distanciaMetros: number | null;
  profissionalId: string | null;
  observacoes: string | null;
};

export function FormularioAtendimento({
  acao,
  clientes,
  servicos,
  profissionais,
  atendimento,
  dataInicial,
  clienteInicial,
  janela,
  descricaoJanela,
}: {
  acao: (estado: EstadoFormulario, fd: FormData) => Promise<EstadoFormulario>;
  clientes: ClienteOpcao[];
  servicos: ServicoOpcao[];
  profissionais: ProfissionalOpcao[];
  atendimento?: AtendimentoEmEdicao;
  /** Deixa o campo de data já preenchido ao marcar a partir de um dia da agenda. */
  dataInicial?: string;
  /** Vindo de "Agendar atendimento" na ficha da cliente: ela já vem escolhida. */
  clienteInicial?: string;
  /** Quando vale o preço normal. A mesma regra roda no servidor ao salvar. */
  janela: JanelaNormal;
  descricaoJanela: string;
}) {
  const [estado, enviar] = useActionState(acao, estadoInicial);
  const erro = (campo: string) => estado.erros?.[campo];

  const [clienteId, setClienteId] = useState(
    atendimento?.clienteId ?? clienteInicial ?? "",
  );
  const [profissionalId, setProfissionalId] = useState(atendimento?.profissionalId ?? "");
  const [servicoId, setServicoId] = useState(atendimento?.servicoId ?? servicos[0]?.id ?? "");
  const [local, setLocal] = useState<"ESTUDIO" | "DOMICILIO">(atendimento?.local ?? "ESTUDIO");
  const [data, setData] = useState(atendimento?.data ?? dataInicial ?? "");
  const [horaInicio, setHoraInicio] = useState(atendimento?.hora ?? "");
  const [endereco, setEndereco] = useState(atendimento?.endereco ?? "");
  const [ida, setIda] = useState(String(atendimento?.deslocamentoIdaMin ?? 30));
  const [volta, setVolta] = useState(String(atendimento?.deslocamentoVoltaMin ?? 30));
  const [taxa, setTaxa] = useState(atendimento?.taxaReais ?? "0");
  const [metros, setMetros] = useState<number | null>(atendimento?.distanciaMetros ?? null);
  const [calculando, iniciarCalculo] = useTransition();
  const [avisoRota, setAvisoRota] = useState<{ ok: boolean; texto: string } | null>(null);

  const servicoInicial = servicos[0];

  /**
   * Qual preço vale para este serviço neste horário.
   *
   * A mesma função roda no servidor ao salvar; aqui ela só antecipa o
   * resultado, para o valor mudar na tela assim que você escolhe o dia.
   */
  function precoDoMomento(
    s: ServicoOpcao | undefined,
    dia: string,
    hh: string,
    ondeE: "ESTUDIO" | "DOMICILIO",
    profId: string = profissionalId,
  ) {
    // Serviço de parceira: a base é a tabela dela, com os acréscimos por cima.
    const base = s?.exigeProfissional
      ? (profissionais.find((x) => x.id === profId)?.precoCentavos ?? s.precoCentavos)
      : (s?.precoCentavos ?? 0);

    const vazio = { centavos: base, fora: false, domicilio: 0, horario: 0 };
    if (!s || !dia || !hh) return vazio;
    try {
      const r = precoParaOHorario({ ...s, precoCentavos: base }, paraUtc(dia, hh), janela, ondeE);
      return {
        centavos: r.centavos,
        fora: r.foraDoHorario,
        domicilio: r.acrescimoDomicilio,
        horario: r.acrescimoForaHorario,
      };
    } catch {
      // Data ou hora pela metade enquanto se digita: mantém o preço base.
      return vazio;
    }
  }

  const inicial = precoDoMomento(
    atendimento ? servicos.find((x) => x.id === atendimento.servicoId) : servicoInicial,
    atendimento?.data ?? dataInicial ?? "",
    atendimento?.hora ?? "",
    atendimento?.local ?? "ESTUDIO",
  );

  const [preco, setPreco] = useState(atendimento?.precoReais ?? paraCampoReal(inicial.centavos));
  const [sinal, setSinal] = useState(
    atendimento?.sinalReais ??
      paraCampoReal(
        calcularSinal(
          inicial.centavos,
          servicoInicial?.percentualSinal ?? 30,
          servicoInicial?.sinalFixoCentavos,
        ),
      ),
  );
  const [acrescimos, setAcrescimos] = useState({
    fora: inicial.fora,
    domicilio: inicial.domicilio,
    horario: inicial.horario,
  });

  const servico = servicos.find((s) => s.id === servicoId);
  const cliente = clientes.find((c) => c.id === clienteId);

  /** Reaplica preço e sinal quando serviço, dia, hora ou local mudam. */
  function reprecificar(
    s: ServicoOpcao | undefined,
    dia: string,
    hh: string,
    ondeE: "ESTUDIO" | "DOMICILIO",
  ) {
    reprecificarCom(s, dia, hh, ondeE, profissionalId);
  }

  function reprecificarCom(
    s: ServicoOpcao | undefined,
    dia: string,
    hh: string,
    ondeE: "ESTUDIO" | "DOMICILIO",
    profId: string,
  ) {
    const r = precoDoMomento(s, dia, hh, ondeE, profId);
    setAcrescimos({ fora: r.fora, domicilio: r.domicilio, horario: r.horario });
    setPreco(paraCampoReal(r.centavos));
    setSinal(
      paraCampoReal(calcularSinal(r.centavos, s?.percentualSinal ?? 30, s?.sinalFixoCentavos)),
    );
  }

  function escolherServico(id: string) {
    setServicoId(id);
    reprecificar(servicos.find((x) => x.id === id), data, horaInicio, local);
  }

  function escolherData(novo: string) {
    setData(novo);
    reprecificar(servico, novo, horaInicio, local);
  }

  function escolherHora(novo: string) {
    setHoraInicio(novo);
    reprecificar(servico, data, novo, local);
  }

  /** Ao ir para domicílio, sugere o endereço que a cliente já tem cadastrado. */
  function escolherLocal(novo: "ESTUDIO" | "DOMICILIO") {
    setLocal(novo);
    // Domicílio tem acréscimo próprio: trocar o local muda o preço.
    reprecificar(servico, data, horaInicio, novo);
    if (novo === "DOMICILIO" && !endereco && cliente?.enderecoPadrao) {
      setEndereco(cliente.enderecoPadrao);
    }
  }

  function escolherProfissional(id: string) {
    setProfissionalId(id);
    // Cada parceira cobra o seu: trocar quem atende muda o preço.
    reprecificarCom(servico, data, horaInicio, local, id);
  }

  function escolherCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (local === "DOMICILIO" && !endereco && c?.enderecoPadrao) setEndereco(c.enderecoPadrao);
  }

  /**
   * Consulta o mapa e preenche ida, volta e taxa.
   *
   * Por botão, e não enquanto você digita: cada consulta ao Google é cobrada,
   * e disparar a cada tecla gastaria dezenas delas para um endereço só.
   */
  function buscarDeslocamento() {
    setAvisoRota(null);
    iniciarCalculo(async () => {
      const r = await calcularDeslocamento(endereco);
      if (!r.ok) {
        setAvisoRota({ ok: false, texto: r.erro });
        return;
      }
      setIda(String(r.idaMin));
      setVolta(String(r.voltaMin));
      setTaxa(r.taxaReais);
      setMetros(r.metros);
      setAvisoRota({ ok: true, texto: r.resumo });
    });
  }

  /** Mexer no preço à mão reajusta o sinal pela regra do serviço. */
  function escolherPreco(novo: string) {
    setPreco(novo);
    if (!servico) return;
    try {
      setSinal(
        paraCampoReal(
          calcularSinal(paraCentavos(novo), servico.percentualSinal, servico.sinalFixoCentavos),
        ),
      );
    } catch {
      // Preço no meio da digitação: deixa o sinal como está.
    }
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
          <SeletorCliente
            clientes={clientes}
            valor={clienteId}
            onEscolher={escolherCliente}
            erro={!!erro("clienteId")}
          />
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

        {servico?.exigeProfissional && (
          <Campo
            rotulo="Quem vai atender"
            erro={erro("profissionalId")}
            dica="Cada parceira tem o próprio preço. A agenda ocupada é a dela — você fica livre no mesmo horário."
          >
            <Selecao
              name="profissionalId"
              value={profissionalId}
              onChange={(e) => escolherProfissional(e.target.value)}
              erro={!!erro("profissionalId")}
            >
              <option value="">Escolha…</option>
              {profissionais.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.nome} — {paraCampoReal(pr.precoCentavos)}
                </option>
              ))}
            </Selecao>
          </Campo>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Data" erro={erro("data")}>
            <Entrada
              type="date"
              name="data"
              value={data}
              onChange={(e) => escolherData(e.target.value)}
              erro={!!erro("data")}
              required
            />
          </Campo>

          <Campo
            rotulo="Hora de início"
            erro={erro("hora")}
            dica={servico ? `Termina ${servico.duracaoMin} min depois.` : undefined}
          >
            <Entrada
              type="time"
              name="hora"
              value={horaInicio}
              onChange={(e) => escolherHora(e.target.value)}
              erro={!!erro("hora")}
              required
            />
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

            {/* Guarda de onde veio a taxa, para ela ter explicação meses depois. */}
            {metros !== null && (
              <input type="hidden" name="distanciaMetros" value={metros} />
            )}

            <div>
              <button
                type="button"
                onClick={buscarDeslocamento}
                disabled={calculando || !endereco.trim()}
                className="rounded-lg border border-borda px-4 py-2 text-sm font-medium text-texto-suave transition hover:bg-superficie-suave disabled:cursor-not-allowed disabled:text-texto-fraco"
              >
                {calculando ? "Consultando o mapa..." : "Calcular deslocamento"}
              </button>
              {avisoRota && (
                <p className={`mt-2 text-sm ${avisoRota.ok ? "text-texto-fraco" : "text-atencao-texto"}`}>
                  {avisoRota.texto}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <Campo rotulo="Ida (min)" erro={erro("deslocamentoIdaMin")} dica="Bloqueia antes.">
                <Entrada
                  name="deslocamentoIdaMin"
                  value={ida}
                  onChange={(e) => setIda(e.target.value)}
                  erro={!!erro("deslocamentoIdaMin")}
                  inputMode="numeric"
                />
              </Campo>
              <Campo rotulo="Volta (min)" erro={erro("deslocamentoVoltaMin")} dica="Bloqueia depois.">
                <Entrada
                  name="deslocamentoVoltaMin"
                  value={volta}
                  onChange={(e) => setVolta(e.target.value)}
                  erro={!!erro("deslocamentoVoltaMin")}
                  inputMode="numeric"
                />
              </Campo>
              <Campo rotulo="Taxa cobrada" erro={erro("taxaDeslocamentoCentavos")} dica="Ida e volta.">
                <Entrada
                  name="taxaDeslocamentoCentavos"
                  value={taxa}
                  onChange={(e) => setTaxa(e.target.value)}
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
        {!atendimento && (
          <Campo
            rotulo="Tipo"
            erro={erro("status")}
            dica="Pré-agendamento não bloqueia o horário; ele avisa se outra cliente quiser a mesma data. Assim que o sinal for pago, vira agendamento sozinho."
          >
            <Selecao name="status" defaultValue="PRE_AGENDAMENTO">
              <option value="PRE_AGENDAMENTO">Pré-agendamento — conversa inicial</option>
              <option value="PENDENTE">Agendamento — já está fechado</option>
            </Selecao>
          </Campo>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Preço do atendimento"
            erro={erro("precoCentavos")}
            dica={
              acrescimos.domicilio > 0 || acrescimos.horario > 0
                ? [
                    acrescimos.domicilio > 0 && `+${paraCampoReal(acrescimos.domicilio)} de domicílio`,
                    acrescimos.horario > 0 &&
                      `+${paraCampoReal(acrescimos.horario)} por ser fora de ${descricaoJanela}`,
                  ]
                    .filter(Boolean)
                    .join(" e ")
                : "Vem da tabela do serviço. Fica congelado neste atendimento."
            }
          >
            <Entrada
              name="precoCentavos"
              value={preco}
              onChange={(e) => escolherPreco(e.target.value)}
              erro={!!erro("precoCentavos")}
              inputMode="decimal"
            />
          </Campo>

          <Campo
            rotulo="Sinal para confirmar"
            erro={erro("sinalCentavos")}
            dica={
              servico
                ? servico.sinalFixoCentavos != null
                  ? `Valor fixo deste serviço. Pagou, o horário é dela.`
                  : `${servico.percentualSinal}% do preço. Pagou, o horário é dela.`
                : undefined
            }
          >
            <Entrada
              name="sinalCentavos"
              value={sinal}
              onChange={(e) => setSinal(e.target.value)}
              erro={!!erro("sinalCentavos")}
              inputMode="decimal"
            />
          </Campo>
        </div>

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
