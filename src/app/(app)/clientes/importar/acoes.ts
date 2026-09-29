"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import { prepararContatos, separarNovos, type ContatoEscolhido } from "@/lib/importacao";

export type ResultadoImportacao = {
  ok: boolean;
  criados?: number;
  jaExistiam?: number;
  erro?: string;
};

/**
 * Cria clientes a partir dos contatos que você marcou na tela.
 *
 * As regras — número válido, sem repetição, teto do lote — estão em
 * `lib/importacao.ts`, e são aplicadas de novo aqui mesmo tendo sido aplicadas
 * na tela: uma Server Action é um endpoint POST de verdade, e o que chega nela
 * pode não ter vindo da tela.
 */
export async function importarContatos(
  _anterior: ResultadoImportacao,
  fd: FormData,
): Promise<ResultadoImportacao> {
  await exigirSessao();

  let escolhidos: ContatoEscolhido[];
  try {
    const bruto = JSON.parse(String(fd.get("escolhidos") ?? "[]")) as unknown;
    if (!Array.isArray(bruto)) throw new Error("formato");
    escolhidos = bruto.map((c) => {
      const obj = c as { nome?: unknown; telefone?: unknown };
      return { nome: String(obj.nome ?? ""), telefone: String(obj.telefone ?? "") };
    });
  } catch {
    return { ok: false, erro: "Não consegui ler a lista de contatos. Tente escolher de novo." };
  }

  const preparo = prepararContatos(escolhidos);
  if (!preparo.ok) return { ok: false, erro: preparo.erro };

  const existentes = await prisma.cliente.findMany({
    where: { telefone: { in: [...preparo.porNumero.keys()] } },
    select: { telefone: true },
  });

  const { novos, jaExistiam } = separarNovos(
    preparo.porNumero,
    existentes.map((c) => c.telefone),
  );

  if (novos.length > 0) {
    // skipDuplicates não ajudaria: telefone não tem índice único no banco. A
    // proteção contra repetir é a consulta acima.
    await prisma.cliente.createMany({ data: novos });
    revalidatePath("/clientes");
  }

  return { ok: true, criados: novos.length, jaExistiam };
}
