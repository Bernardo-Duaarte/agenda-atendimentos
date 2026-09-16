import "server-only";

/**
 * Distância e tempo entre dois endereços, pela Routes API do Google.
 *
 * A chave vive só no servidor. Uma chave do Google Maps exposta no navegador é
 * um dos vazamentos mais explorados que existem: qualquer pessoa copia e passa
 * a gastar na sua conta. Por isso esta consulta acontece numa Server Action e
 * nunca no cliente.
 *
 * Usa a Routes API, e não a Distance Matrix, porque ela aceita endereço em
 * texto direto — dispensa um passo separado de geocodificação — e devolve
 * duração considerando trânsito.
 */

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

export type Trajeto = {
  metros: number;
  minutos: number;
};

export type ResultadoTrajeto =
  | { ok: true; trajeto: Trajeto }
  | { ok: false; erro: string };

export async function consultarTrajeto(
  origem: string,
  destino: string,
): Promise<ResultadoTrajeto> {
  const chave = process.env.GOOGLE_MAPS_API_KEY;
  if (!chave) {
    return {
      ok: false,
      erro: "Chave do Google Maps não configurada. Sem ela o cálculo automático não funciona — dá para informar ida, volta e taxa à mão.",
    };
  }
  if (!origem.trim()) {
    return { ok: false, erro: "Endereço do estúdio não preenchido em Configuração." };
  }
  if (!destino.trim()) {
    return { ok: false, erro: "Preencha o endereço da cliente antes de calcular." };
  }

  let resposta: Response;
  try {
    resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": chave,
        // Sem a máscara o Google recusa o pedido. Pedir só o que se usa também
        // deixa a resposta pequena e a cobrança na faixa mais barata.
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { address: origem },
        destination: { address: destino },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        regionCode: "BR",
        languageCode: "pt-BR",
      }),
      // Se o Google demorar, é melhor falhar rápido e deixar preencher à mão
      // do que travar o formulário.
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return { ok: false, erro: "Não consegui falar com o Google Maps agora. Tente de novo ou preencha à mão." };
  }

  if (!resposta.ok) {
    // A mensagem do Google costuma ser técnica e em inglês; traduzir os casos
    // comuns evita que um erro de configuração pareça um defeito do sistema.
    const detalhe = await resposta.text().catch(() => "");
    if (resposta.status === 403 || /API key|PERMISSION_DENIED/i.test(detalhe)) {
      return { ok: false, erro: "O Google recusou a chave. Verifique se a Routes API está ativada no projeto." };
    }
    if (resposta.status === 429) {
      return { ok: false, erro: "Limite de consultas do Google atingido. Preencha à mão por enquanto." };
    }
    return { ok: false, erro: `O Google respondeu com erro (${resposta.status}).` };
  }

  const dados = (await resposta.json()) as {
    routes?: { distanceMeters?: number; duration?: string }[];
  };

  const rota = dados.routes?.[0];
  if (!rota?.distanceMeters || !rota.duration) {
    return {
      ok: false,
      erro: "Não encontrei caminho entre os dois endereços. Confira se estão completos, com cidade.",
    };
  }

  // A duração vem como "1234s".
  const segundos = Number(rota.duration.replace(/s$/, ""));
  if (!Number.isFinite(segundos)) {
    return { ok: false, erro: "O Google devolveu uma duração que não entendi." };
  }

  return {
    ok: true,
    trajeto: {
      metros: rota.distanceMeters,
      minutos: Math.max(1, Math.round(segundos / 60)),
    },
  };
}
