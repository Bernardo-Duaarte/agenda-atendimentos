import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

/**
 * Toda data no banco é UTC. Este módulo é a única fronteira onde ela vira
 * horário de São Paulo. Se você formatar data em qualquer outro lugar do
 * projeto, o horário de verão (se voltar) vira bug silencioso.
 */
export const FUSO = "America/Sao_Paulo";

/** "2026-08-28" + "14:30" (horário de SP) -> Date em UTC, pronto pro banco. */
export function paraUtc(data: string, hora: string): Date {
  const d = fromZonedTime(`${data}T${hora}:00`, FUSO);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Data ou hora inválida: "${data}" "${hora}"`);
  }
  return d;
}

/** Formato livre, sempre no fuso de SP e em português. */
export function formatar(d: Date, formato: string): string {
  return formatInTimeZone(d, FUSO, formato, { locale: ptBR });
}

export const hora = (d: Date) => formatar(d, "HH:mm");
export const dataCurta = (d: Date) => formatar(d, "dd/MM/yyyy");
export const dataLonga = (d: Date) => formatar(d, "EEEE, d 'de' MMMM");
export const dataHora = (d: Date) => formatar(d, "dd/MM 'às' HH:mm");

/** Valor para <input type="date"> / <input type="time">, já no fuso de SP. */
export const paraInputDate = (d: Date) => formatar(d, "yyyy-MM-dd");
export const paraInputTime = (d: Date) => formatar(d, "HH:mm");

/**
 * A janela que o atendimento realmente ocupa na agenda: inclui ida e volta.
 * É isso que a verificação de conflito compara, não inicio/fim.
 */
export function janelaOcupada(a: {
  inicio: Date;
  fim: Date;
  deslocamentoIdaMin: number;
  deslocamentoVoltaMin: number;
}): { de: Date; ate: Date } {
  return {
    de: new Date(a.inicio.getTime() - a.deslocamentoIdaMin * 60_000),
    ate: new Date(a.fim.getTime() + a.deslocamentoVoltaMin * 60_000),
  };
}
