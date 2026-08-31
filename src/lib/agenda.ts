import "server-only";
import { janelaOcupada } from "./tempo";

/**
 * Regras de ocupação da agenda.
 *
 * O que ocupa a agenda não é o atendimento, é a janela: de `início − ida` até
 * `fim + volta`. Um domicílio às 14h com 40 min de trânsito bloqueia desde as
 * 13h20 — comparar só início/fim deixaria você marcar às 13h30 e descobrir o
 * problema na hora de sair.
 */

/** Status que não ocupam horário: já não vão acontecer. */
export const STATUS_LIVRES = ["CANCELADO"] as const;

export type JanelaDeAtendimento = {
  id: string;
  inicio: Date;
  fim: Date;
  deslocamentoIdaMin: number;
  deslocamentoVoltaMin: number;
};

/** Duas janelas se sobrepõem quando uma começa antes da outra terminar. */
export function haSobreposicao(a: JanelaDeAtendimento, b: JanelaDeAtendimento): boolean {
  const ja = janelaOcupada(a);
  const jb = janelaOcupada(b);
  // Encostar não é conflito: terminar 15h e começar 15h é sequência válida.
  return ja.de < jb.ate && jb.de < ja.ate;
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
