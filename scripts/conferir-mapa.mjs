#!/usr/bin/env node
/**
 * Confere se todo caminho citado no MAPA.md ainda existe.
 *
 * Um mapa com caminho errado atrasa mais do que mapa nenhum, e arquivo some ou
 * muda de lugar sem ninguém lembrar de abrir o mapa. Rodar:
 *
 *     node scripts/conferir-mapa.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const texto = readFileSync(join(raiz, "MAPA.md"), "utf8");

// [texto](caminho) e [texto](<caminho com parênteses>)
const alvos = new Set();
for (const m of texto.matchAll(/\]\((<[^>]+>|[^)\s]+)\)/g)) {
  const caminho = m[1].replace(/^<|>$/g, "");
  if (!caminho.startsWith("http") && !caminho.startsWith("#")) alvos.add(caminho);
}

const quebrados = [...alvos].sort().filter((c) => !existsSync(join(raiz, c)));

if (quebrados.length === 0) {
  console.log(`MAPA.md: ${alvos.size} caminhos, todos existem.`);
  process.exit(0);
}

console.error(`MAPA.md: ${quebrados.length} de ${alvos.size} caminhos não existem:`);
for (const c of quebrados) console.error(`  ${c}`);
console.error("\nAtualize o MAPA.md — ou o caminho mudou, ou o arquivo sumiu.");
process.exit(1);
