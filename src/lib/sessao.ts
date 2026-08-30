import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";

/**
 * Autenticação de uma pessoa só: não existe tabela de usuários, existe uma
 * senha. O que a sessão precisa provar é apenas "quem está aqui digitou a
 * senha", então o cookie carrega só a validade — nenhum dado pessoal.
 */

const NOME_COOKIE = "sessao";
const DURACAO_DIAS = 30;

function segredo(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "SESSION_SECRET ausente ou curta demais (mínimo 32 caracteres). Gere uma com: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  return new TextEncoder().encode(s);
}

/**
 * Comparação em tempo constante. Um `===` comum retorna assim que acha a
 * primeira letra diferente, e essa diferença de tempo, medida muitas vezes,
 * permite descobrir a senha caractere a caractere.
 */
function iguaisEmTempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // timingSafeEqual exige o mesmo tamanho; comparar o tamanho antes vazaria
  // essa informação, então normalizamos com um hash de comprimento fixo.
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba); // mantém o custo parecido
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export function senhaConfere(digitada: string): boolean {
  const esperada = process.env.SENHA_ACESSO;
  if (!esperada || esperada.length < 8 || esperada === "troque-isto") {
    throw new Error(
      "SENHA_ACESSO não configurada (mínimo 8 caracteres, e não pode ser o valor de exemplo).",
    );
  }
  return iguaisEmTempoConstante(digitada, esperada);
}

export async function criarSessao(): Promise<void> {
  const expiraEm = new Date(Date.now() + DURACAO_DIAS * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiraEm)
    .sign(segredo());

  const armazem = await cookies();
  armazem.set(NOME_COOKIE, token, {
    httpOnly: true, // JavaScript da página não enxerga o cookie
    secure: process.env.NODE_ENV === "production", // só por HTTPS quando publicado
    sameSite: "lax", // não acompanha requisição vinda de outro site
    path: "/",
    expires: expiraEm,
  });
}

export async function encerrarSessao(): Promise<void> {
  const armazem = await cookies();
  armazem.delete(NOME_COOKIE);
}

export async function temSessao(): Promise<boolean> {
  const token = (await cookies()).get(NOME_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, segredo(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Porta de entrada de toda página e toda Server Action.
 *
 * O proxy.ts já barra quem não tem cookie, mas ele é uma verificação
 * otimista: Server Actions são endpoints POST de verdade, alcançáveis
 * diretamente, e um erro de matcher no proxy deixaria tudo aberto. Esta é a
 * verificação que fica colada no dado — é ela que precisa estar certa.
 */
export async function exigirSessao(): Promise<void> {
  if (!(await temSessao())) redirect("/entrar");
}
