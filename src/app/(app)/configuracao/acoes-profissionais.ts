"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/sessao";
import {
  comValidacao,
  dinheiro,
  texto,
  ErroDeCampo,
  type EstadoFormulario,
} from "@/lib/formulario";

/**
 * Salva as parceiras de uma vez.
 *
 * Um formulário só para todas, e não um por linha, porque é uma lista curta
 * que se ajusta junto — quando uma reajusta o preço, normalmente você confere
 * as outras na mesma sentada.
 */
export async function salvarProfissionais(
  _anterior: EstadoFormulario,
  fd: FormData,
): Promise<EstadoFormulario> {
  await exigirSessao();

  return comValidacao(async () => {
    const ids = fd.getAll("id").map(String);

    for (const [i, id] of ids.entries()) {
      const nome = String(fd.getAll("nome")[i] ?? "").trim();
      const precoTexto = String(fd.getAll("precoCentavos")[i] ?? "").trim();
      const repasseTexto = String(fd.getAll("repasseCentavos")[i] ?? "").trim();

      // Linha em branco no fim do formulário: é o espaço para acrescentar
      // alguém, e ficar vazia é o caso normal.
      if (!nome && !precoTexto) continue;
      if (!nome) throw new ErroDeCampo("nome", "Falta o nome de uma das profissionais.");

      const pedaco = new FormData();
      pedaco.set("preco", precoTexto);
      pedaco.set("repasse", repasseTexto || precoTexto);
      const precoCentavos = dinheiro(pedaco, "preco", `Preço de ${nome}`);
      const repasseCentavos = dinheiro(pedaco, "repasse", `Repasse de ${nome}`);

      if (repasseCentavos > precoCentavos) {
        throw new ErroDeCampo(
          "repasseCentavos",
          `O repasse de ${nome} é maior que o que a cliente paga.`,
        );
      }

      if (id) {
        await prisma.profissional.update({
          where: { id },
          data: { nome, precoCentavos, repasseCentavos },
        });
      } else {
        await prisma.profissional.create({
          data: { nome, precoCentavos, repasseCentavos },
        });
      }
    }

    revalidatePath("/configuracao");
    revalidatePath("/agenda");
    redirect("/configuracao?salvo=parceiras");
  });
}

/**
 * Tira uma parceira da lista.
 *
 * Desativa em vez de apagar: os atendimentos que ela já fez apontam para o
 * cadastro, e apagá-lo levaria junto a explicação de quem atendeu.
 */
export async function desativarProfissional(fd: FormData): Promise<void> {
  await exigirSessao();
  const id = texto(fd, "id", "Profissional");

  await prisma.profissional.update({ where: { id }, data: { ativo: false } });

  revalidatePath("/configuracao");
  redirect("/configuracao?salvo=parceiras");
}
