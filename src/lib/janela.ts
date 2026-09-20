import "server-only";
import { prisma } from "./prisma";
import { descreverJanela, type JanelaNormal } from "./precificacao";

const PADRAO: JanelaNormal = {
  horaAbertura: "07:00",
  horaFechamento: "21:00",
  diasNormais: "1,2,3,4,5,6",
};

/**
 * A janela de horário normal, do banco.
 *
 * Com padrão embutido para o sistema funcionar antes de alguém abrir a tela de
 * ajustes: sem isso, um banco recém-criado faria toda marcação parecer fora do
 * horário e cobrar o preço diferenciado.
 */
export async function janelaNormal(): Promise<JanelaNormal> {
  const c = await prisma.configuracao.findUnique({
    where: { id: "unica" },
    select: { horaAbertura: true, horaFechamento: true, diasNormais: true },
  });
  return c ?? PADRAO;
}

export async function janelaComDescricao() {
  const janela = await janelaNormal();
  return { janela, descricao: descreverJanela(janela) };
}
