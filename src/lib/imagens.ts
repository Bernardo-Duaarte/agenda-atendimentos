import type { CSSProperties } from "react";

/**
 * As fotos do visual não moram no repositório.
 *
 * São de uma pessoa real, e o código é público. Cada imagem vem de uma variável
 * de ambiente com o endereço dela (um link de armazenamento próprio, ou um
 * caminho local como `/privado/retrato.webp` em desenvolvimento). Sem a
 * variável, o app funciona igual, só com a paleta de cores e sem foto.
 *
 * `NEXT_PUBLIC_` porque o endereço vai parar no HTML de qualquer jeito: o
 * navegador precisa dele para baixar a imagem.
 */
export const IMAGENS = {
  /** Fundo desfocado dentro do app. */
  atmosfera: process.env.NEXT_PUBLIC_IMG_ATMOSFERA || null,
  /** Retrato inteiro na tela de entrada. */
  retrato: process.env.NEXT_PUBLIC_IMG_RETRATO || null,
  /** Miniatura redonda no cabeçalho. */
  rosto: process.env.NEXT_PUBLIC_IMG_ROSTO || null,
} as const;

/** Passa a imagem ao CSS como variável, para o `globals.css` não conhecer o endereço. */
export function variavelCss(nome: string, endereco: string | null): CSSProperties {
  return endereco ? ({ [nome]: `url(${JSON.stringify(endereco)})` } as CSSProperties) : {};
}
