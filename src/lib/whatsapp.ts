import { dataCurta, hora, paraInputDate } from "./tempo";

/**
 * Não existe API aqui de propósito. O link wa.me abre o WhatsApp com a
 * mensagem já digitada — você só confere e aperta enviar.
 *
 * Custo zero, sem verificação da Meta, e principalmente: sem risco de
 * banirem o número de trabalho, que é o que acontece com as bibliotecas
 * não-oficiais que automatizam o envio.
 */
export function linkWhatsApp(telefone: string, mensagem: string): string {
  const numero = telefone.replace(/\D/g, "");
  if (numero.length < 12) {
    // 55 + DDD (2) + número (8 ou 9)
    throw new Error(
      `Telefone precisa incluir o código do país: "${telefone}" (ex: 5511999999999)`,
    );
  }
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** "14h30", e "14h" quando é hora cheia. */
function horaPorExtenso(d: Date): string {
  const [hh, mm] = hora(d).split(":");
  return mm === "00" ? `${hh}h` : `${hh}h${mm}`;
}

/**
 * "amanhã", "hoje" ou a data.
 *
 * O texto do lembrete diz "amanhã", que é quando ele costuma ser enviado. Mas
 * dizer "amanhã" numa mensagem mandada com uma semana de antecedência seria
 * errado — e faria a cliente aparecer no dia errado. A palavra acompanha a
 * distância real até o atendimento.
 */
function quando(inicio: Date, agora: Date): string {
  const dia = (d: Date) => paraInputDate(d); // já no fuso de São Paulo
  const hoje = dia(agora);
  const amanha = dia(new Date(agora.getTime() + 24 * 60 * 60 * 1000));
  const doAtendimento = dia(inicio);

  if (doAtendimento === hoje) return "hoje";
  if (doAtendimento === amanha) return "amanhã";
  return `dia ${dataCurta(inicio)}`;
}

export function mensagemLembrete(
  a: {
    cliente: { nome: string };
    servico: { nome: string };
    inicio: Date;
    local: "ESTUDIO" | "DOMICILIO";
    endereco: string | null;
  },
  opcoes: { enderecoEstudio?: string | null; agora?: Date } = {},
): string {
  const primeiroNome = a.cliente.nome.trim().split(/\s+/)[0];
  const agora = opcoes.agora ?? new Date();

  // No estúdio a cliente vem até você; em domicílio é o contrário. O endereço
  // do estúdio vem da Configuração para não ficar dois lugares para atualizar
  // no dia em que você mudar de sala.
  const onde =
    a.local === "DOMICILIO"
      ? a.endereco
        ? `Vou até você: ${a.endereco}.`
        : "Vou até você."
      : opcoes.enderecoEstudio
        ? `Te espero na ${opcoes.enderecoEstudio}.`
        : "Te espero aqui!";

  return [
    `Ei, ${primeiroNome}! Tudo bem?`,
    ``,
    `Você tem um agendamento para ${a.servico.nome}, ${quando(a.inicio, agora)}, às ${horaPorExtenso(a.inicio)}.`,
    onde,
    ``,
    `Caso tenha qualquer dúvida, me mande uma mensagem por aqui! 😚`,
  ].join("\n");
}

/** 5511999999999 -> "(11) 99999-9999". Só para exibição. */
export function formatarTelefone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}
