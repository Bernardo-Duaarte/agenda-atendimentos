"use server";

import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { consultarTrajeto } from "@/lib/mapa";
import { calcularDeslocamentoIdaEVolta, formatarDistancia } from "@/lib/deslocamento";
import { paraCampoReal } from "@/lib/dinheiro";

export type RespostaDeslocamento =
  | {
      ok: true;
      idaMin: number;
      voltaMin: number;
      taxaReais: string;
      metros: number;
      resumo: string;
    }
  | { ok: false; erro: string };

/**
 * Calcula ida, volta e taxa a partir do endereço da cliente.
 *
 * Chamada por botão, e não a cada tecla digitada: consulta ao Google é paga e
 * um cálculo disparado sozinho enquanto a pessoa digita gastaria dezenas de
 * consultas para um endereço só.
 */
export async function calcularDeslocamento(
  enderecoCliente: string,
): Promise<RespostaDeslocamento> {
  await exigirSessao();

  const config = await prisma.configuracao.findUnique({ where: { id: "unica" } });
  if (!config?.enderecoEstudio) {
    return {
      ok: false,
      erro: "Falta o endereço do estúdio. Preencha em Configuração — é o ponto de partida do cálculo.",
    };
  }

  const semFormula =
    config.taxaBaseCentavos === 0 &&
    config.taxaPorKmCentavos === 0 &&
    config.taxaPorMinutoCentavos === 0;

  const r = await consultarTrajeto(config.enderecoEstudio, enderecoCliente);
  if (!r.ok) return { ok: false, erro: r.erro };

  const d = calcularDeslocamentoIdaEVolta(r.trajeto, config);

  return {
    ok: true,
    idaMin: d.minutosIda,
    voltaMin: d.minutosVolta,
    taxaReais: paraCampoReal(d.taxaCentavos),
    metros: d.metros,
    resumo: semFormula
      ? `${formatarDistancia(d.metros)} e ${d.minutosIda} min por trecho. A taxa ficou zerada porque os valores da fórmula ainda não foram preenchidos em Configuração.`
      : `${formatarDistancia(d.metros)} e ${d.minutosIda} min por trecho, ida e volta.`,
  };
}
