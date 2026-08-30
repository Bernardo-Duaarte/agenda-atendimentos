import { hora } from "./tempo";

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

export function mensagemLembrete(a: {
  cliente: { nome: string };
  servico: { nome: string };
  inicio: Date;
  local: "ESTUDIO" | "DOMICILIO";
  endereco: string | null;
}): string {
  const primeiroNome = a.cliente.nome.trim().split(/\s+/)[0];
  const onde =
    a.local === "DOMICILIO" && a.endereco
      ? `Vou até você: ${a.endereco}.`
      : "Te espero aqui!";

  return [
    `Oi, ${primeiroNome}! Tudo bem?`,
    ``,
    `Passando pra confirmar seu horário de ${a.servico.nome} amanhã às ${hora(a.inicio)}.`,
    onde,
    ``,
    `Qualquer coisa é só me chamar por aqui.`,
  ].join("\n");
}

/** 5511999999999 -> "(11) 99999-9999". Só para exibição. */
export function formatarTelefone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}
