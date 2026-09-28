import { janelaOcupada } from "./tempo";

/**
 * Regras de ocupação da agenda.
 *
 * Lógica pura, sem banco e sem segredo: pode rodar nos dois lados. É o que
 * permite testá-la direto e, no futuro, mostrar o conflito no formulário
 * antes de salvar.
 *
 * O que ocupa a agenda não é o atendimento, é a janela: de `início − ida` até
 * `fim + volta`. Um domicílio às 14h com 40 min de trânsito bloqueia desde as
 * 13h20 — comparar só início/fim deixaria você marcar às 13h30 e descobrir o
 * problema na hora de sair.
 */

/**
 * Quem ocupa a agenda, e com que força.
 *
 * CANCELADO some: não vai acontecer.
 *
 * PRE_AGENDAMENTO não bloqueia, só avisa. Duas clientes podem estar
 * negociando a mesma data, e prender o sábado numa conversa que talvez não
 * feche custa caro. Quem paga o sinal primeiro fica com o horário — e aí o
 * atendimento passa a bloquear de verdade.
 */
export const NAO_OCUPA = ["CANCELADO"] as const;
export const APENAS_AVISA = ["PRE_AGENDAMENTO"] as const;

export function bloqueiaHorario(status: string): boolean {
  return (
    !(NAO_OCUPA as readonly string[]).includes(status) &&
    !(APENAS_AVISA as readonly string[]).includes(status)
  );
}

export type JanelaDeAtendimento = {
  id: string;
  inicio: Date;
  fim: Date;
  deslocamentoIdaMin: number;
  deslocamentoVoltaMin: number;
};

/**
 * Quem vai executar o atendimento. Nulo é você.
 *
 * O conflito é entre atendimentos da MESMA pessoa: você maquiando uma cliente
 * e a Giselle penteando outra acontecem ao mesmo tempo. Duas clientes com a
 * Giselle no mesmo horário, não.
 */
export type Executora = { profissionalId: string | null };

export function mesmaExecutora(a: Executora, b: Executora): boolean {
  return a.profissionalId === b.profissionalId;
}

/** Duas janelas se sobrepõem quando uma começa antes da outra terminar. */
export function haSobreposicao(a: JanelaDeAtendimento, b: JanelaDeAtendimento): boolean {
  const ja = janelaOcupada(a);
  const jb = janelaOcupada(b);
  // Encostar não é conflito: terminar 15h e começar 15h é sequência válida.
  return ja.de < jb.ate && jb.de < ja.ate;
}

/**
 * Conflito de verdade: os horários se cruzam E a mesma pessoa é necessária.
 *
 * Sobreposição sozinha não basta. Antes disso o sistema bloqueava qualquer
 * cruzamento, o que impedia agendamentos que acontecem normalmente.
 */
export function haConflito(
  a: JanelaDeAtendimento & Executora,
  b: JanelaDeAtendimento & Executora,
): boolean {
  return haSobreposicao(a, b) && mesmaExecutora(a, b);
}

/**
 * Intervalo a buscar no banco ao procurar conflito.
 *
 * Vai um dia para cada lado porque o deslocamento pode empurrar a janela para
 * fora do dia do atendimento — uma volta longa de um atendimento de 23h cai no
 * dia seguinte, e ele precisa aparecer na busca.
 */
export function intervaloDeBusca(a: JanelaDeAtendimento): { de: Date; ate: Date } {
  const j = janelaOcupada(a);
  const DIA = 24 * 60 * 60 * 1000;
  return { de: new Date(j.de.getTime() - DIA), ate: new Date(j.ate.getTime() + DIA) };
}

/** Descreve o choque em português, para a mensagem de erro do formulário. */
export function descreverConflito(
  outro: JanelaDeAtendimento & { cliente: { nome: string } },
  formatarHora: (d: Date) => string,
): string {
  const j = janelaOcupada(outro);
  const temTransito =
    outro.deslocamentoIdaMin > 0 || outro.deslocamentoVoltaMin > 0;

  const faixa = `${formatarHora(j.de)} às ${formatarHora(j.ate)}`;
  return temTransito
    ? `Conflito com ${outro.cliente.nome}, que ocupa das ${faixa} contando o deslocamento.`
    : `Conflito com ${outro.cliente.nome}, das ${faixa}.`;
}
