/**
 * Geração do arquivo de calendário (iCalendar, RFC 5545).
 *
 * Formato antigo e cheio de regras miúdas que, se ignoradas, fazem o iPhone
 * simplesmente não mostrar nada — sem mensagem de erro. As três que mais
 * derrubam: linhas terminam em CRLF, linhas longas precisam ser dobradas em
 * 75 BYTES (não caracteres — acento ocupa dois), e vírgula, ponto e vírgula e
 * barra invertida têm de ser escapados.
 */

const CRLF = "\r\n";

/** Vírgula, ponto e vírgula e barra invertida têm significado no formato. */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Dobra a linha em 75 bytes, continuando com um espaço no início da seguinte.
 *
 * A conta é em bytes, e não em caracteres, porque "Cílios" ocupa 7 bytes em
 * UTF-8 e não 6. Cortar no meio de um caractere de dois bytes corrompe o
 * arquivo, e o iPhone descarta o calendário inteiro sem avisar.
 */
function dobrar(linha: string): string {
  const bytes = Buffer.from(linha, "utf8");
  if (bytes.length <= 75) return linha;

  const partes: string[] = [];
  let inicio = 0;
  let limite = 75;

  while (inicio < bytes.length) {
    let fim = Math.min(inicio + limite, bytes.length);
    // Não cortar no meio de um caractere multibyte: 10xxxxxx é continuação.
    while (fim > inicio && fim < bytes.length && (bytes[fim]! & 0xc0) === 0x80) fim--;
    partes.push(bytes.subarray(inicio, fim).toString("utf8"));
    inicio = fim;
    limite = 74; // as seguintes perdem um byte para o espaço de continuação
  }

  return partes.join(`${CRLF} `);
}

/** Data em UTC, no formato do calendário: 20260915T170000Z */
export function paraDataIcal(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export type EventoIcal = {
  uid: string;
  inicio: Date;
  fim: Date;
  titulo: string;
  local?: string | null;
  descricao?: string | null;
  /** Minutos antes para o alarme. Ausente = sem alarme. */
  alarmeMin?: number;
};

function montarEvento(e: EventoIcal, agora: Date): string[] {
  const linhas = [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${paraDataIcal(agora)}`,
    `DTSTART:${paraDataIcal(e.inicio)}`,
    `DTEND:${paraDataIcal(e.fim)}`,
    `SUMMARY:${escapar(e.titulo)}`,
  ];

  if (e.local) linhas.push(`LOCATION:${escapar(e.local)}`);
  if (e.descricao) linhas.push(`DESCRIPTION:${escapar(e.descricao)}`);

  if (e.alarmeMin != null) {
    linhas.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `TRIGGER:-PT${e.alarmeMin}M`,
      `DESCRIPTION:${escapar(e.titulo)}`,
      "END:VALARM",
    );
  }

  linhas.push("END:VEVENT");
  return linhas;
}

export function montarCalendario(
  eventos: EventoIcal[],
  { nome, agora = new Date() }: { nome: string; agora?: Date },
): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda//Atendimentos//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(nome)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    // Sugestões de frequência de atualização. O iPhone respeita quando quer,
    // mas sem elas ele tende a demorar bem mais.
    "X-PUBLISHED-TTL:PT15M",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    ...eventos.flatMap((e) => montarEvento(e, agora)),
    "END:VCALENDAR",
  ];

  return linhas.map(dobrar).join(CRLF) + CRLF;
}
