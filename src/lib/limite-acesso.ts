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
export const LIMITE_GERAL = 40;

/**
 * O limite geral existe porque o limite por IP sozinho não segura quem tem
 * muitos endereços. Ele é alto o bastante para não atrapalhar o uso normal de
 * uma pessoa só, e baixo o bastante para tornar um ataque distribuído lento.
 */
export async function estaBloqueado(ip: string): Promise<boolean> {
  const desde = new Date(Date.now() - JANELA_MIN * 60 * 1000);

  const [doIp, geral] = await Promise.all([
    prisma.tentativaAcesso.count({ where: { ip, sucesso: false, criadoEm: { gte: desde } } }),
    prisma.tentativaAcesso.count({ where: { sucesso: false, criadoEm: { gte: desde } } }),
  ]);

  return doIp >= LIMITE_POR_IP || geral >= LIMITE_GERAL;
}

export async function registrarTentativa(ip: string, sucesso: boolean): Promise<void> {
  await prisma.tentativaAcesso.create({ data: { ip, sucesso } });
}

/**
 * Um acerto zera o contador do IP; de carona, some com o que já passou de 24h.
 *
 * A faxina mora aqui dentro de propósito. Exportá-la como Server Action
 * criaria um endpoint público capaz de apagar o histórico de tentativas — ou
 * seja, de desarmar este próprio limite.
 */
export async function limparAposSucesso(ip: string): Promise<void> {
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.tentativaAcesso.deleteMany({
    where: { OR: [{ ip }, { criadoEm: { lt: ontem } }] },
  });
}
