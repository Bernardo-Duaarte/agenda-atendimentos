/**
 * Montagem da grade do mês.
 *
 * Matemática de calendário pura, sem banco: fica fora do módulo de consultas
 * para poder ser testada direto e usada dos dois lados.
 *
 * As datas são manipuladas ao MEIO-DIA UTC de propósito. Somar 24h sobre a
 * meia-noite esbarra em fuso e horário de verão e faz um dia sumir ou repetir;
 * no meio do dia sobra folga de doze horas para qualquer lado.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

export type DiaDaGrade = { data: string; doMes: boolean };

export function semanasDoMes(mes: string): DiaDaGrade[][] {
  const [ano, m] = mes.split("-").map(Number);
  const primeiro = new Date(Date.UTC(ano!, m! - 1, 1, 12));
  const ultimo = new Date(Date.UTC(ano!, m!, 0, 12));

  // getUTCDay(): 0 é domingo. A grade começa na segunda, então o recuo é
  // quantos dias andar para trás até chegar nela.
  const recuo = (primeiro.getUTCDay() + 6) % 7;
  let atual = new Date(primeiro.getTime() - recuo * DIA_MS);

  const semanas: DiaDaGrade[][] = [];
  while (atual <= ultimo) {
    semanas.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(atual.getTime() + i * DIA_MS);
        return { data: d.toISOString().slice(0, 10), doMes: d.getUTCMonth() === m! - 1 };
      }),
    );
    atual = new Date(atual.getTime() + 7 * DIA_MS);
  }
  return semanas;
}
