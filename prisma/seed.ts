import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Dados de exemplo para o sistema não nascer vazio.
 *
 * Não cadastra nenhuma cliente de propósito: cliente é dado real de pessoa
 * real, e nome inventado no meio da lista atrapalha mais do que ajuda.
 * Serviço e produto, sim — são seus, e é mais rápido ajustar do que digitar.
 *
 * Roda com: npm run db:seed
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

/**
 * `conteudo` é quanto vem na embalagem, na unidade do produto, e `precoPacote`
 * é o que se paga por ela. O custo por unidade sai da divisão — é assim que a
 * ficha técnica consegue dizer que 4 ml de base custam R$ 26,16.
 */
const PRODUTOS = [
  { chave: "base",      nome: "Base líquida",         marca: "Mac",         unidade: "ml",        conteudo: 35,  precoPacote: 22900, minimo: "20", pacotes: 2 },
  { chave: "primer",    nome: "Primer facial",        marca: "Vult",        unidade: "ml",        conteudo: 30,  precoPacote: 6900,  minimo: "15", pacotes: 1 },
  { chave: "corretivo", nome: "Corretivo",            marca: "Mac",         unidade: "ml",        conteudo: 6,   precoPacote: 18900, minimo: "4",  pacotes: 2 },
  { chave: "po",        nome: "Pó compacto",          marca: "Ruby Rose",   unidade: "g",         conteudo: 12,  precoPacote: 4500,  minimo: "6",  pacotes: 2 },
  { chave: "cilios",    nome: "Cílios postiços",      marca: null,          unidade: "un",        conteudo: 1,   precoPacote: 1500,  minimo: "5",  pacotes: 20 },
  { chave: "batom",     nome: "Batom matte",          marca: "Payot",       unidade: "aplicacao", conteudo: 50,  precoPacote: 5900,  minimo: "20", pacotes: 1 },
  { chave: "fixador",   nome: "Fixador de maquiagem", marca: "Urban Decay", unidade: "ml",        conteudo: 118, precoPacote: 12900, minimo: "30", pacotes: 1 },
];

const SERVICOS = [
  {
    nome: "Maquiagem social",
    descricao: "Pele, olhos e boca para festa ou evento. Inclui cílios postiços.",
    precoCentavos: 18000,
    // Acréscimos somados ao preço base (ver Configuração).
    acrescimoDomicilioCentavos: 3000,
    acrescimoForaHorarioCentavos: 3000,
    duracaoMin: 60,
    ficha: { primer: "2", base: "4", corretivo: "1", po: "0.5", cilios: "1", batom: "1", fixador: "3" },
  },
  {
    nome: "Maquiagem de noiva",
    descricao: "Maquiagem de longa duração, à prova de lágrima e foto. Inclui teste prévio.",
    precoCentavos: 65000,
    acrescimoDomicilioCentavos: 0,
    acrescimoForaHorarioCentavos: 0,
    duracaoMin: 150,
    ficha: { primer: "3", base: "7", corretivo: "2", po: "1", cilios: "1", batom: "1", fixador: "6" },
  },
];

async function main() {
  const jaTem = (await prisma.servico.count()) + (await prisma.produto.count());
  if (jaTem > 0) {
    console.log("Já existem serviços ou produtos cadastrados. Nada foi alterado.");
    return;
  }

  const ids = new Map<string, string>();

  for (const p of PRODUTOS) {
    const quantidadeInicial = p.conteudo * p.pacotes;
    const pagoNaCompra = p.precoPacote * p.pacotes;

    const produto = await prisma.produto.create({
      data: {
        nome: p.nome,
        marca: p.marca,
        unidade: p.unidade,
        conteudoEmbalagem: String(p.conteudo),
        custoUnitarioCentavos: Math.round(p.precoPacote / p.conteudo),
        estoqueMinimo: p.minimo,
        movimentos: {
          create: {
            tipo: "ENTRADA",
            quantidade: String(quantidadeInicial),
            custoTotalCentavos: pagoNaCompra,
            observacao: `Estoque inicial de exemplo (${p.pacotes}x ${p.conteudo}${p.unidade})`,
          },
        },
      },
    });
    ids.set(p.chave, produto.id);
  }
  console.log(`${PRODUTOS.length} produtos criados, cada um com sua entrada de estoque.`);

  for (const s of SERVICOS) {
    await prisma.servico.create({
      data: {
        nome: s.nome,
        descricao: s.descricao,
        precoCentavos: s.precoCentavos,
        acrescimoDomicilioCentavos: s.acrescimoDomicilioCentavos,
        acrescimoForaHorarioCentavos: s.acrescimoForaHorarioCentavos,
        duracaoMin: s.duracaoMin,
        insumos: {
          create: Object.entries(s.ficha).map(([chave, quantidade]) => ({
            produtoId: ids.get(chave)!,
            quantidade,
          })),
        },
      },
    });
  }
  console.log(`${SERVICOS.length} serviços criados, com ficha técnica preenchida.`);

  await prisma.configuracao.upsert({
    where: { id: "unica" },
    update: {},
    create: { id: "unica" },
  });
  console.log("Linha de configuração criada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
