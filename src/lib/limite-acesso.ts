import "server-only";
import { prisma } from "./prisma";

/**
 * Limite de tentativas de entrada.
 *
 * Fica fora da Server Action para poder ser exercitado por teste direto — e
 * porque a regra em si não depende de HTTP: é contagem de falhas por janela
 * de tempo.
 */

export const JANELA_MIN = 15;
export const LIMITE_POR_IP = 8;

/**
 * O limite geral existe para ataque distribuído, onde o limite por IP não
 * segura. Mas ele é uma faca de dois gumes: bloqueia todo mundo, inclusive a
 * dona do sistema. Alguém disposto a errar a senha N vezes conseguiria
 * trancá-la para fora da própria agenda, e repetir sempre que ela tentasse.
 *
 * Duas defesas contra isso:
 *   1. O número é alto — só dispara num flood de verdade, não num aborrecimento.
 *   2. Um IP que já entrou com sucesso recentemente não é afetado por ele.
 *      Aparelho conhecido continua entrando mesmo durante um ataque.
 */
export const LIMITE_GERAL = 200;
export const DIAS_APARELHO_CONHECIDO = 30;

function desdeJanela(): Date {
  return new Date(Date.now() - JANELA_MIN * 60 * 1000);
}

function desdeConhecido(): Date {
  return new Date(Date.now() - DIAS_APARELHO_CONHECIDO * 24 * 60 * 60 * 1000);
}

export async function estaBloqueado(ip: string): Promise<boolean> {
  // 1. O próprio IP errando demais: bloqueia, sem exceção. É o caso comum.
  const falhasDoIp = await prisma.tentativaAcesso.count({
    where: { ip, sucesso: false, criadoEm: { gte: desdeJanela() } },
  });
  if (falhasDoIp >= LIMITE_POR_IP) return true;

  // 2. Aparelho conhecido — já entrou daqui — passa por cima do limite geral.
  const conhecido = await prisma.tentativaAcesso.count({
    where: { ip, sucesso: true, criadoEm: { gte: desdeConhecido() } },
  });
  if (conhecido > 0) return false;

  // 3. IP desconhecido, e o sistema inteiro sob enxurrada: segura.
  const geral = await prisma.tentativaAcesso.count({
    where: { sucesso: false, criadoEm: { gte: desdeJanela() } },
  });
  return geral >= LIMITE_GERAL;
}

export async function registrarTentativa(ip: string, sucesso: boolean): Promise<void> {
  await prisma.tentativaAcesso.create({ data: { ip, sucesso } });
}

/**
 * Após um acerto: apaga as FALHAS deste IP (o contador zera) e faz faxina do
 * que é velho demais para importar.
 *
 * Repare que os acertos deste IP são preservados — são eles que marcam o
 * aparelho como conhecido. Apagar tudo, como eu fazia antes, jogava fora
 * justamente a informação que protege você durante um ataque.
 *
 * Fica aqui dentro, e não exportada como Server Action, porque toda função
 * exportada de um arquivo "use server" vira endpoint público — e este apaga
 * histórico de tentativas, ou seja, desarmaria o próprio limite.
 */
export async function limparAposSucesso(ip: string): Promise<void> {
  await prisma.tentativaAcesso.deleteMany({
    where: {
      OR: [
        { ip, sucesso: false },
        { criadoEm: { lt: desdeConhecido() } },
      ],
    },
  });
}
