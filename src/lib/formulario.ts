import { paraCentavos } from "./dinheiro";

/**
 * Estado que toda Server Action de formulário devolve. O `useActionState` do
 * React guarda isso e re-renderiza o form com os erros no lugar certo.
 *
 * `erros` é por campo — o formulário sabe onde pintar de vermelho.
 * `erroGeral` é para o que não pertence a um campo (banco fora do ar, conflito).
 */
export type EstadoFormulario = {
  ok: boolean;
  erroGeral?: string;
  erros?: Record<string, string>;
};

export const estadoInicial: EstadoFormulario = { ok: false };

/** Erro que carrega o nome do campo, para o catch saber onde pendurar a mensagem. */
export class ErroDeCampo extends Error {
  constructor(
    readonly campo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

function bruto(fd: FormData, campo: string): string {
  const v = fd.get(campo);
  return typeof v === "string" ? v.trim() : "";
}

export function texto(fd: FormData, campo: string, rotulo: string): string {
  const v = bruto(fd, campo);
  if (!v) throw new ErroDeCampo(campo, `${rotulo} é obrigatório.`);
  return v;
}

export function textoOpcional(fd: FormData, campo: string): string | null {
  return bruto(fd, campo) || null;
}

export function booleano(fd: FormData, campo: string): boolean {
  return fd.get(campo) != null;
}

/**
 * Telefone brasileiro -> E.164 sem o '+'. Aceita o que a pessoa digitar
 * ((11) 99999-9999, 11999999999, +55 11 99999-9999) e normaliza.
 */
export function telefone(fd: FormData, campo: string, rotulo: string): string {
  const digitos = texto(fd, campo, rotulo).replace(/\D/g, "");

  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if (digitos.length === 12 || digitos.length === 13) {
    if (!digitos.startsWith("55")) {
      throw new ErroDeCampo(campo, `${rotulo}: só atendemos números do Brasil.`);
    }
    return digitos;
  }
  throw new ErroDeCampo(
    campo,
    `${rotulo} incompleto. Use DDD + número, ex: (11) 99999-9999.`,
  );
}

export function dinheiro(fd: FormData, campo: string, rotulo: string): number {
  const v = texto(fd, campo, rotulo);
  try {
    const centavos = paraCentavos(v);
    if (centavos < 0) throw new Error();
    return centavos;
  } catch {
    throw new ErroDeCampo(campo, `${rotulo} inválido. Ex: 150,00`);
  }
}

export function inteiro(
  fd: FormData,
  campo: string,
  rotulo: string,
  { min = 0 }: { min?: number } = {},
): number {
  const v = texto(fd, campo, rotulo);
  const n = Number(v.replace(/\D/g, ""));
  if (!Number.isInteger(n) || n < min) {
    throw new ErroDeCampo(campo, `${rotulo} precisa ser um número${min > 0 ? ` a partir de ${min}` : ""}.`);
  }
  return n;
}

/** Quantidade com casas decimais ("0,5", "1.25"). Devolve string, que é o que o Prisma quer para Decimal. */
export function decimal(fd: FormData, campo: string, rotulo: string): string {
  const v = texto(fd, campo, rotulo).replace(",", ".");
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    throw new ErroDeCampo(campo, `${rotulo} inválida. Ex: 0,5`);
  }
  return String(n);
}

export function dataOpcional(fd: FormData, campo: string, rotulo: string): Date | null {
  const v = bruto(fd, campo);
  if (!v) return null;
  // <input type="date"> devolve "yyyy-MM-dd". Guardamos como data pura (@db.Date),
  // então o meio-dia UTC evita que qualquer fuso empurre para o dia anterior.
  const d = new Date(`${v}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new ErroDeCampo(campo, `${rotulo} inválida.`);
  return d;
}

/**
 * Embrulha o corpo de uma Server Action: converte ErroDeCampo em estado de
 * formulário em vez de deixar a exceção subir e virar tela de erro.
 */
export async function comValidacao(
  fn: () => Promise<void>,
): Promise<EstadoFormulario> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof ErroDeCampo) return { ok: false, erros: { [e.campo]: e.message } };
    throw e;
  }
}

/** Percentual inteiro de 0 a 100. */
export function percentual(fd: FormData, campo: string, rotulo: string): number {
  const n = inteiro(fd, campo, rotulo);
  if (n > 100) throw new ErroDeCampo(campo, `${rotulo} não pode passar de 100%.`);
  return n;
}

/** Inteiro que pode não vir. Devolve null em vez de estourar. */
export function inteiroOpcional(fd: FormData, campo: string): number | null {
  const v = fd.get(campo);
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v.replace(/\D/g, ""));
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Dinheiro que pode não vir. Vazio devolve null — diferente de zero. */
export function dinheiroOpcional(fd: FormData, campo: string, rotulo: string): number | null {
  const v = fd.get(campo);
  if (typeof v !== "string" || v.trim() === "") return null;
  return dinheiro(fd, campo, rotulo);
}
