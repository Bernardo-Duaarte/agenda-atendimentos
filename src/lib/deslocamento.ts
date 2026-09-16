/**
 * Taxa de deslocamento a partir da distância e do tempo.
 *
 * A fórmula imita o jeito do Uber — base, por quilômetro e por minuto —
 * porque é o que chega mais perto numa cidade com trânsito: um trajeto curto
 * às 18h custa mais que o mesmo trajeto às 10h, e só o quilômetro não explica
 * isso.
 *
 * Não é consulta ao Uber. Não existe API pública para isso; estes três
 * números são calibrados pela dona do sistema, comparando com o que o
 * aplicativo realmente cobrou.
 */

export type FormulaTaxa = {
  taxaBaseCentavos: number;
  taxaPorKmCentavos: number;
  taxaPorMinutoCentavos: number;
};

export type Deslocamento = {
  /** Distância de um trecho, em metros. */
  metros: number;
  /** Minutos de um trecho. */
  minutosIda: number;
  minutosVolta: number;
  /** Valor total, já contando ida e volta. */
  taxaCentavos: number;
};

/** Um trecho: base + km + minutos. */
export function taxaDeUmTrecho(
  metros: number,
  minutos: number,
  f: FormulaTaxa,
): number {
  const km = metros / 1000;
  return Math.round(
    f.taxaBaseCentavos + km * f.taxaPorKmCentavos + minutos * f.taxaPorMinutoCentavos,
  );
}

/**
 * Ida e volta.
 *
 * A volta é cobrada porque você paga o carro nos dois sentidos — e a base
 * entra duas vezes de propósito: são duas corridas, cada uma com a sua
 * bandeirada.
 */
export function calcularDeslocamentoIdaEVolta(
  trajeto: { metros: number; minutos: number },
  f: FormulaTaxa,
): Deslocamento {
  const umTrecho = taxaDeUmTrecho(trajeto.metros, trajeto.minutos, f);

  return {
    metros: trajeto.metros,
    // O caminho de volta costuma levar um tempo parecido; usar o mesmo valor
    // evita uma segunda consulta ao Google só para inverter origem e destino.
    minutosIda: trajeto.minutos,
    minutosVolta: trajeto.minutos,
    taxaCentavos: umTrecho * 2,
  };
}

/** "12,4 km" — para mostrar de onde veio o valor. */
export function formatarDistancia(metros: number): string {
  return `${(metros / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}
