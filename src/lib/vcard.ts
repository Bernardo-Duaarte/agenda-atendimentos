/**
 * Leitura de um arquivo de contatos exportado do telefone (.vcf).
 *
 * Só extrai nome e telefone — é o que vira cliente. Endereço, foto e
 * aniversário ficam de fora de propósito: importar tudo encheria o cadastro
 * de dado que você não pediu.
 *
 * Duas armadilhas tratadas aqui, ambas capazes de estragar nome com acento:
 *
 *  - Linhas longas são quebradas e continuam na seguinte começando por espaço.
 *    Sem juntar de volta, "Gonçalves" pode virar duas metades.
 *  - Exportações no formato antigo codificam acentos como =C3=A7. Sem
 *    decodificar, "Conceição" chega como "Concei=C3=A7=C3=A3o".
 */

export type ContatoLido = {
  nome: string;
  /** Todos os números encontrados, na ordem em que aparecem. */
  telefones: string[];
};

/** Junta as linhas de continuação: uma linha que começa com espaço ou tab. */
function desdobrar(texto: string): string[] {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const juntas: string[] = [];

  for (const linha of linhas) {
    if (/^[ \t]/.test(linha) && juntas.length > 0) {
      juntas[juntas.length - 1] += linha.slice(1);
    } else {
      juntas.push(linha);
    }
  }
  return juntas;
}

/** =C3=A7 vira ç. Usado pelo formato antigo (vCard 2.1). */
function decodificarCitavel(valor: string): string {
  // O "=" no fim da linha é continuação e já foi resolvido no desdobramento.
  const bytes: number[] = [];
  let i = 0;

  while (i < valor.length) {
    if (valor[i] === "=" && /^[0-9A-Fa-f]{2}$/.test(valor.slice(i + 1, i + 3))) {
      bytes.push(parseInt(valor.slice(i + 1, i + 3), 16));
      i += 3;
    } else {
      bytes.push(valor.charCodeAt(i));
      i += 1;
    }
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

/** Tira as barras de escape do formato: \, \; \n */
function desescapar(valor: string): string {
  return valor
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

type Campo = { nome: string; parametros: string[]; valor: string };

function lerCampo(linha: string): Campo | null {
  const doisPontos = linha.indexOf(":");
  if (doisPontos < 0) return null;

  const cabecalho = linha.slice(0, doisPontos);
  let valor = linha.slice(doisPontos + 1);

  const partes = cabecalho.split(";");
  // Alguns exportadores prefixam o campo com um grupo: "item1.TEL".
  const nome = partes[0]!.split(".").pop()!.toUpperCase();
  const parametros = partes.slice(1).map((p) => p.toUpperCase());

  if (parametros.some((p) => p.includes("QUOTED-PRINTABLE"))) {
    valor = decodificarCitavel(valor);
  }
  return { nome, parametros, valor };
}

/**
 * Monta o nome a partir do campo estruturado N, quando não há FN.
 * N vem como: sobrenome;nome;meio;prefixo;sufixo
 */
function nomeDoCampoN(valor: string): string {
  const [sobrenome = "", primeiro = "", meio = ""] = valor.split(";").map(desescapar);
  return [primeiro, meio, sobrenome].filter(Boolean).join(" ").trim();
}

export function lerContatos(texto: string): ContatoLido[] {
  const contatos: ContatoLido[] = [];

  let nome = "";
  let nomeEstruturado = "";
  let telefones: string[] = [];
  let dentro = false;

  for (const linha of desdobrar(texto)) {
    const bruta = linha.trim();
    if (!bruta) continue;

    if (/^BEGIN:VCARD$/i.test(bruta)) {
      dentro = true;
      nome = "";
      nomeEstruturado = "";
      telefones = [];
      continue;
    }

    if (/^END:VCARD$/i.test(bruta)) {
      const escolhido = nome || nomeEstruturado;
      // Contato sem nome ou sem número não vira cliente: faltaria justamente
      // o que o sistema usa para identificar e para mandar mensagem.
      if (dentro && escolhido && telefones.length > 0) {
        contatos.push({ nome: escolhido, telefones });
      }
      dentro = false;
      continue;
    }

    if (!dentro) continue;

    const campo = lerCampo(bruta);
    if (!campo) continue;

    if (campo.nome === "FN") nome = desescapar(campo.valor);
    else if (campo.nome === "N") nomeEstruturado = nomeDoCampoN(campo.valor);
    else if (campo.nome === "TEL") {
      const numero = desescapar(campo.valor);
      if (numero) telefones.push(numero);
    }
  }

  return contatos;
}
