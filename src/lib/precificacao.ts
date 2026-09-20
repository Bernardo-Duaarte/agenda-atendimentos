import { formatInTimeZone } from "date-fns-tz";
import { FUSO } from "./tempo";

/**
 * Preço normal ou diferenciado, conforme quando o atendimento começa.
 *
 * Sem `server-only` de propósito: o formulário precisa recalcular enquanto a
 * pessoa mexe na data e na hora, para o valor aparecer na hora em vez de só
 * depois de salvar. A mesma função roda nos dois lados, e é a do servidor que
 * vale — o navegador só antecipa o que vai acontecer.
 */

export type JanelaNormal = {
  /** "07:00" */
  horaAbertura: string;
  /** "21:00" */
  horaFechamento: string;
  /** "1,2,3,4,5,6" — 1 é segunda, 7 é domingo. */
  diasNormais: string;
};

export const NOMES_DOS_DIAS = [
  { numero: 1, curto: "seg", longo: "segunda" },
  { numero: 2, curto: "ter", longo: "terça" },
  { numero: 3, curto: "qua", longo: "quarta" },
  { numero: 4, curto: "qui", longo: "quinta" },
  { numero: 5, curto: "sex", longo: "sexta" },
  { numero: 6, curto: "sáb", longo: "sábado" },
  { numero: 7, curto: "dom", longo: "domingo" },
] as const;

export function diasDaJanela(diasNormais: string): number[] {
  return diasNormais
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
}

/**
 * O atendimento começa dentro do horário de trabalho?
 *
 * A conta é feita no fuso de São Paulo, e não em UTC: "sábado às 20h" é uma
 * afirmação sobre o relógio da parede, e comparar o horário guardado sem
 * converter erraria por três horas — jogando metade das noites para o dia
 * seguinte.
 */
export function dentroDaJanela(inicio: Date, janela: JanelaNormal): boolean {
  // getDay() do JS usaria o fuso da máquina; formatar no fuso certo não.
  const diaSemanaISO = Number(formatInTimeZone(inicio, FUSO, "i")); // 1=segunda, 7=domingo
  if (!diasDaJanela(janela.diasNormais).includes(diaSemanaISO)) return false;

  const hhmm = formatInTimeZone(inicio, FUSO, "HH:mm");
  // Comparação de texto funciona porque "HH:mm" tem largura fixa e zero à
  // esquerda: "07:00" < "09:30" < "21:00".
  return hhmm >= janela.horaAbertura && hhmm < janela.horaFechamento;
}

export type PrecoAplicado = {
  centavos: number;
  foraDoHorario: boolean;
  /** Existe preço diferenciado cadastrado para este serviço? */
  temPrecoDiferenciado: boolean;
};

export function precoParaOHorario(
  servico: { precoCentavos: number; precoForaHorarioCentavos: number | null },
  inicio: Date,
  janela: JanelaNormal,
): PrecoAplicado {
  const dentro = dentroDaJanela(inicio, janela);
  const temDiferenciado = servico.precoForaHorarioCentavos != null;

  return {
    centavos:
      !dentro && temDiferenciado ? servico.precoForaHorarioCentavos! : servico.precoCentavos,
    foraDoHorario: !dentro,
    temPrecoDiferenciado: temDiferenciado,
  };
}

/** "segunda a sábado, das 07:00 às 21:00" — para explicar a regra na tela. */
export function descreverJanela(janela: JanelaNormal): string {
  const dias = diasDaJanela(janela.diasNormais).sort((a, b) => a - b);
  if (dias.length === 0) return "nenhum dia configurado";

  const nome = (n: number) => NOMES_DOS_DIAS.find((d) => d.numero === n)!.longo;

  // Sequência corrida vira "segunda a sábado"; salteada vira lista.
  const corrido = dias.every((d, i) => i === 0 || d === dias[i - 1]! + 1);
  const texto =
    dias.length === 1
      ? nome(dias[0]!)
      : corrido
        ? `${nome(dias[0]!)} a ${nome(dias[dias.length - 1]!)}`
        : dias.map(nome).join(", ");

  return `${texto}, das ${janela.horaAbertura} às ${janela.horaFechamento}`;
}
