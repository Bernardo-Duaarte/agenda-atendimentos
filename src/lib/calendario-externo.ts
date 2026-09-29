import "server-only";
import { lerCompromissos, type CompromissoExterno } from "./ics-leitura";

/**
 * Busca a sua agenda pessoal publicada.
 *
 * Existe porque o caminho contrário não é possível: o iPhone não deixa site
 * nenhum ler o Calendário, e o iCloud não abre API. O que a Apple oferece é
 * publicar um calendário num endereço — e esse endereço qualquer um lê.
 *
 * Só leitura, e de propósito. Um evento do Calendário tem título e horário,
 * mas não cliente, serviço nem preço: ele nunca viraria um atendimento
 * completo sozinho. O que ele faz é ocupar o horário, para você não marcar
 * em cima.
 */

export type LeituraExterna =
  | { ok: true; compromissos: CompromissoExterno[] }
  | { ok: false; erro: string };

/**
 * Guarda o arquivo por alguns minutos.
 *
 * Sem isto, cada abertura da agenda baixaria o calendário inteiro da Apple de
 * novo — lento para você e abusivo com eles. Dez minutos é bem menos do que o
 * iCloud leva para republicar uma alteração, então não acrescenta atraso real.
 */
const VALIDADE_MS = 10 * 60_000;
const cache = new Map<string, { em: number; texto: string }>();

function paraHttps(url: string): string {
  // O iCloud entrega o link como webcal://, que só o app de calendário abre.
  return url.trim().replace(/^webcal:\/\//i, "https://");
}

export async function compromissosExternos(
  url: string | null | undefined,
  de: Date,
  ate: Date,
): Promise<LeituraExterna> {
  if (!url?.trim()) return { ok: true, compromissos: [] };

  const endereco = paraHttps(url);
  const guardado = cache.get(endereco);

  let texto: string;
  if (guardado && Date.now() - guardado.em < VALIDADE_MS) {
    texto = guardado.texto;
  } else {
    try {
      const r = await fetch(endereco, {
        signal: AbortSignal.timeout(15_000),
        headers: { Accept: "text/calendar" },
      });
      if (!r.ok) {
        return {
          ok: false,
          erro: `O endereço do calendário respondeu ${r.status}. Confira se ele continua publicado.`,
        };
      }
      texto = await r.text();
      if (!texto.includes("BEGIN:VCALENDAR")) {
        return { ok: false, erro: "Esse endereço não devolveu um calendário. Confira o link." };
      }
      cache.set(endereco, { em: Date.now(), texto });
    } catch {
      // A agenda não pode quebrar porque a Apple demorou: devolve o erro e a
      // tela segue mostrando os seus atendimentos.
      return { ok: false, erro: "Não consegui buscar seu calendário agora." };
    }
  }

  try {
    return { ok: true, compromissos: await lerCompromissos(texto, de, ate) };
  } catch {
    return { ok: false, erro: "Não consegui entender o formato desse calendário." };
  }
}

export { compromissosQueCruzam } from "./ics-leitura";
export type { CompromissoExterno } from "./ics-leitura";
