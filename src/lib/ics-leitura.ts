import { async as parseIcalAsync } from "node-ical";

/**
 * Interpretação de um arquivo de calendário.
 *
 * Separada da busca na internet de propósito: é aqui que moram as decisões
 * que podem errar — expandir um evento semanal, tratar dia inteiro, recortar
 * o período — e um módulo marcado como "só servidor" não pode nem ser
 * testado direto.
 */

export type CompromissoExterno = {
  /** Inclui a data: um evento que se repete gera vários, e cada um é único. */
  id: string;
  titulo: string;
  inicio: Date;
  fim: Date;
  /** Aniversário, feriado, viagem: informa, mas não impede de atender. */
  diaInteiro: boolean;
};

const UMA_HORA_MS = 60 * 60_000;

export async function lerCompromissos(
  texto: string,
  de: Date,
  ate: Date,
): Promise<CompromissoExterno[]> {
  const dados = await parseIcalAsync.parseICS(texto);
  const compromissos: CompromissoExterno[] = [];

  for (const item of Object.values(dados)) {
    if (!item || typeof item !== "object" || item.type !== "VEVENT") continue;

    const evento = item as {
      uid?: string;
      summary?: string;
      start?: Date & { dateOnly?: boolean };
      end?: Date;
      rrule?: { between?: (a: Date, b: Date, inc?: boolean) => Date[] };
    };
    if (!evento.start) continue;

    // Sem hora de fim, o padrão do formato é uma hora.
    const duracaoMs = evento.end
      ? evento.end.getTime() - evento.start.getTime()
      : UMA_HORA_MS;
    const diaInteiro = Boolean(evento.start.dateOnly);
    const titulo = evento.summary?.trim() || "Compromisso";

    // Um "toda terça" aparece uma vez no arquivo: sem expandir, só a primeira
    // ocorrência entraria na agenda.
    const inicios: Date[] = evento.rrule?.between
      ? // A janela abre para trás pela duração do evento, senão um que começa
        // antes do período e invade o começo dele ficaria de fora.
        evento.rrule.between(new Date(de.getTime() - duracaoMs), ate, true)
      : [evento.start];

    for (const inicio of inicios) {
      const fim = new Date(inicio.getTime() + duracaoMs);
      if (fim <= de || inicio >= ate) continue;

      compromissos.push({
        id: `${evento.uid ?? titulo}-${inicio.toISOString()}`,
        titulo,
        inicio,
        fim,
        diaInteiro,
      });
    }
  }

  compromissos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return compromissos;
}

/**
 * Compromissos com hora marcada que cruzam uma janela.
 *
 * Eventos de dia inteiro ficam de fora: aniversário e feriado ocupam o dia no
 * calendário, mas não impedem de atender. Tratá-los como choque bloquearia
 * dias inteiros por nada.
 */
export function compromissosQueCruzam(
  compromissos: CompromissoExterno[],
  de: Date,
  ate: Date,
): CompromissoExterno[] {
  return compromissos.filter((c) => !c.diaInteiro && c.inicio < ate && de < c.fim);
}
